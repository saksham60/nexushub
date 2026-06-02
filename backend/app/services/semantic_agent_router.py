from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from langsmith import traceable

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.services.agent_capabilities import is_capability_question
from app.services.openai_llm_service import OpenAILLMService
from app.services.tool_catalog_service import TOOL_METADATA, ToolCatalogService

logger = get_logger(__name__)

RoutingResponseType = Literal["tool", "direct_response", "clarification", "error"]

REQUIRED_ARGUMENTS: dict[str, set[str]] = {
    "mail_create_draft_reply": {"to", "subject", "context"},
    "mail_mark_as_read": {"messageIds"},
    "docs_analyze_uploaded_file": {"fileName"},
    "docs_build_report": {"fileName"},
    "teams_extract_action_items": {"text"},
    "approval_execute": {"approvalId", "approved"},
    "calendar_schedule_meeting": {"subject", "startTime"},
}


@dataclass(slots=True)
class SemanticRoutingDecision:
    response_type: RoutingResponseType
    tool_name: str | None = None
    arguments: dict[str, Any] | None = None
    confidence: float = 0.0
    reason: str = ""
    requires_approval: bool = False
    clarification_question: str | None = None
    error_code: str | None = None
    error_message: str | None = None


class SemanticAgentRouter:
    def __init__(
        self,
        *,
        llm: OpenAILLMService | None = None,
        catalog_service: ToolCatalogService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._llm = llm or OpenAILLMService()
        self._catalog_service = catalog_service or ToolCatalogService()

    @traceable(run_type="chain")
    async def route(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        message: str,
        selected_context: dict[str, Any] | None = None,
    ) -> SemanticRoutingDecision:
        del user_id, workspace_id
        normalized = message.strip()
        if not normalized:
            return SemanticRoutingDecision(
                response_type="clarification",
                clarification_question="What would you like NexusHub to do?",
                reason="The command was empty.",
            )
        if _is_greeting_or_smalltalk(normalized) or is_capability_question(normalized):
            return SemanticRoutingDecision(
                response_type="direct_response",
                tool_name="direct_response",
                confidence=1.0,
                reason="Direct status or capability response.",
            )
        if not self._settings.enable_semantic_router:
            return SemanticRoutingDecision(
                response_type="error",
                error_code="FEATURE_DISABLED",
                error_message="Semantic routing is disabled. Set ENABLE_SEMANTIC_ROUTER=true to enable it.",
                reason="Semantic router feature flag is disabled.",
            )

        try:
            catalog = await self._catalog_service.get_catalog()
        except Exception as exc:
            logger.warning(
                "Tool catalog load failed during semantic routing.",
                extra={"metadata": {"errorType": type(exc).__name__}},
            )
            return SemanticRoutingDecision(
                response_type="error",
                error_code="TOOL_CATALOG_UNAVAILABLE",
                error_message="NexusHub could not load the MCP tool catalog.",
                reason="Tool catalog unavailable.",
            )

        tools = [tool for tool in catalog.get("tools", []) if isinstance(tool, dict)]
        tool_names = {str(tool.get("name")) for tool in tools if tool.get("name")}
        if not tool_names:
            return SemanticRoutingDecision(
                response_type="error",
                error_code="TOOL_CATALOG_EMPTY",
                error_message="No MCP tools are currently available.",
                reason="Tool catalog returned no tools.",
            )

        deterministic = _deterministic_route(normalized, tool_names=tool_names)
        if deterministic:
            return deterministic

        try:
            selection = await self._llm.complete_json(
                system_prompt=_router_system_prompt(),
                user_prompt=json.dumps(
                    {
                        "message": normalized,
                        "availableTools": tools,
                        "selectedContext": selected_context or {},
                    },
                    ensure_ascii=True,
                ),
            )
        except Exception as exc:
            deterministic = _deterministic_route(normalized, tool_names=tool_names)
            if deterministic:
                deterministic.reason = (
                    f"{deterministic.reason} OpenAI routing was unavailable, so deterministic routing was used."
                )
                return deterministic
            logger.warning(
                "LLM semantic routing failed.",
                extra={"metadata": {"errorType": type(exc).__name__, "messageLength": len(normalized)}},
            )
            error_code = "LLM_ROUTER_UNAVAILABLE"
            error_message = "NexusHub semantic routing is unavailable. Please try again."
            if _is_rate_limit_error(exc):
                error_code = "LLM_ROUTER_RATE_LIMITED"
                error_message = "NexusHub AI routing is temporarily rate limited. Please try again shortly."
            return SemanticRoutingDecision(
                response_type="error",
                error_code=error_code,
                error_message=error_message,
                reason="LLM routing failed.",
            )

        tool_name = selection.get("toolName")
        tool_name = str(tool_name) if tool_name else None
        confidence = _confidence(selection.get("confidence"))
        reason = str(selection.get("reason") or "Selected by semantic router.")[:500]
        requires_clarification = bool(selection.get("requiresClarification"))
        clarification = selection.get("clarificationQuestion")
        clarification_question = str(clarification) if clarification else None

        if requires_clarification or confidence < 0.65:
            return SemanticRoutingDecision(
                response_type="clarification",
                tool_name=tool_name if tool_name in tool_names else None,
                confidence=confidence,
                reason=reason,
                clarification_question=clarification_question
                or "Which NexusHub action should I take with this request?",
            )

        if not tool_name or tool_name not in tool_names:
            return SemanticRoutingDecision(
                response_type="clarification",
                confidence=confidence,
                reason=reason,
                clarification_question=clarification_question
                or "I could not match that request to an available NexusHub tool.",
            )

        arguments = self._sanitize_arguments(
            tool_name=tool_name,
            raw_arguments=selection.get("arguments") or {},
            original_message=normalized,
        )
        missing = REQUIRED_ARGUMENTS.get(tool_name, set()) - set(arguments)
        if missing:
            return SemanticRoutingDecision(
                response_type="clarification",
                tool_name=tool_name,
                arguments=arguments,
                confidence=confidence,
                reason=reason,
                clarification_question=clarification_question
                or f"I need {', '.join(sorted(missing))} before I can run {tool_name}.",
            )

        metadata = TOOL_METADATA.get(tool_name, {})
        return SemanticRoutingDecision(
            response_type="tool",
            tool_name=tool_name,
            arguments=arguments,
            confidence=confidence,
            reason=reason,
            requires_approval=bool(metadata.get("requiresApproval")),
        )

    def _sanitize_arguments(
        self, *, tool_name: str, raw_arguments: Any, original_message: str
    ) -> dict[str, Any]:
        if not isinstance(raw_arguments, dict):
            raw_arguments = {}
        schema = TOOL_METADATA.get(tool_name, {}).get("inputSchema") or {}
        allowed = set(schema) if isinstance(schema, dict) else set()
        sanitized = {key: value for key, value in raw_arguments.items() if key in allowed}
        sanitized.pop("user_id", None)
        sanitized.pop("workspace_id", None)

        if tool_name == "teams_extract_action_items" and not sanitized.get("text"):
            sanitized["text"] = original_message
        return sanitized


def _router_system_prompt() -> str:
    return """You are NexusHub's backend semantic routing agent.
Choose the best available backend/MCP tool for a real user command.
Return strict JSON only, with no markdown.

JSON shape:
{
  "intent": "short intent",
  "toolName": "available_tool_name_or_null",
  "arguments": {},
  "confidence": 0.0,
  "reason": "short reason",
  "requiresClarification": false,
  "clarificationQuestion": null
}

Rules:
- Select only from availableTools.
- Do not invent tools.
- Include only tool-specific arguments. Never include user_id, workspace_id, tokens, or credentials.
- Prefer read-only tools unless the user clearly asks to prepare a write action.
- Tools marked requiresApproval are approval-gated; route them only when the request is explicit.
- For calendar_reschedule_event, extract sourceTime, targetStartTime, targetEndTime, date, timezone, and meetingTitle when present. Convert obvious times to 24-hour HH:MM when possible.
- For calendar_schedule_meeting, extract subject, startTime, endTime, attendees, and timezone when present. Use email addresses for attendees when the user provides them.
- If selectedContext.pendingIntent is present, treat the message as a follow-up answer to the previous clarification. Prefer the previousToolName and merge partialArguments with the followUpMessage.
- If required details are missing, set requiresClarification true.
- If no tool fits, set toolName null and requiresClarification true.
- If the user asks a general capability question, choose no tool and request a direct capability response.
- Do not guess from isolated words; use the full meaning of the message."""


def _is_greeting_or_smalltalk(message: str) -> bool:
    normalized = message.strip().lower().strip(".!?")
    return normalized in {
        "hi",
        "hello",
        "hey",
        "hii",
        "yo",
        "thanks",
        "thank you",
        "help",
    }


def _confidence(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(parsed, 1.0))


def _deterministic_route(
    message: str, *, tool_names: set[str]
) -> SemanticRoutingDecision | None:
    if "calendar_schedule_meeting" not in tool_names:
        return None
    parsed = _parse_calendar_schedule_message(message)
    if not parsed:
        return None
    if parsed.get("missing"):
        missing = ", ".join(parsed["missing"])
        return SemanticRoutingDecision(
            response_type="clarification",
            tool_name="calendar_schedule_meeting",
            arguments=parsed.get("arguments") or {},
            confidence=0.82,
            reason="Matched deterministic meeting scheduling pattern.",
            requires_approval=True,
            clarification_question=f"I need {missing} before I can schedule the meeting.",
        )
    return SemanticRoutingDecision(
        response_type="tool",
        tool_name="calendar_schedule_meeting",
        arguments=parsed["arguments"],
        confidence=0.9,
        reason="Matched deterministic meeting scheduling pattern.",
        requires_approval=True,
    )


def _parse_calendar_schedule_message(message: str) -> dict[str, Any] | None:
    normalized = message.lower()
    if not re.search(r"\b(schedule|book|set\s*up|setup|create)\b", normalized):
        return None
    if not re.search(r"\b(meeting|invite|call|sync)\b", normalized):
        return None

    timezone = _extract_timezone(normalized)
    start_time = _extract_time(message)
    attendees = _extract_attendees(message)
    subject = _extract_subject(message, attendees=attendees)
    arguments: dict[str, Any] = {
        "subject": subject,
        "attendees": attendees,
        "timezone": timezone,
    }
    missing: list[str] = []
    if not subject:
        missing.append("a meeting title")
    if start_time is None:
        missing.append("a start time")
    else:
        target_date = _extract_date(
            normalized, timezone=timezone, parsed_time=start_time
        )
        start_dt = datetime.combine(
            target_date, start_time, tzinfo=_safe_zoneinfo(timezone)
        )
        end_dt = start_dt + timedelta(minutes=30)
        arguments["startTime"] = start_dt.isoformat()
        arguments["endTime"] = end_dt.isoformat()

    if missing:
        return {"arguments": arguments, "missing": missing}
    return {"arguments": arguments}


def _extract_timezone(normalized_message: str) -> str:
    aliases = {
        "ist": "Asia/Kolkata",
        "india time": "Asia/Kolkata",
        "utc": "UTC",
        "gmt": "UTC",
        "est": "America/New_York",
        "edt": "America/New_York",
        "pst": "America/Los_Angeles",
        "pdt": "America/Los_Angeles",
    }
    for alias, timezone in aliases.items():
        if re.search(rf"\b{re.escape(alias)}\b", normalized_message):
            return timezone
    return "Asia/Kolkata"


def _extract_time(message: str) -> time | None:
    match = re.search(
        r"\b(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b",
        message,
        re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b",
            message,
            re.IGNORECASE,
        )
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or "0")
    meridiem = (match.group(3) or "").lower().replace(".", "")
    if minute > 59 or hour > 23:
        return None
    if meridiem == "pm" and hour < 12:
        hour += 12
    elif meridiem == "am" and hour == 12:
        hour = 0
    if hour > 23:
        return None
    return time(hour=hour, minute=minute)


def _extract_date(
    normalized_message: str, *, timezone: str, parsed_time: time
) -> date:
    now = datetime.now(_safe_zoneinfo(timezone))
    if re.search(r"\btomorrow\b", normalized_message):
        return (now + timedelta(days=1)).date()
    if re.search(r"\btoday\b", normalized_message):
        return now.date()

    iso_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", normalized_message)
    if iso_match:
        try:
            return date.fromisoformat(iso_match.group(1))
        except ValueError:
            pass

    target = now.date()
    if datetime.combine(target, parsed_time, tzinfo=now.tzinfo) <= now:
        target = target + timedelta(days=1)
    return target


def _extract_attendees(message: str) -> list[str]:
    emails = re.findall(
        r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", message, re.IGNORECASE
    )
    if emails:
        return list(dict.fromkeys(email.lower() for email in emails))

    with_match = re.search(
        r"\bwith\s+(.+?)(?=\s+(?:at|on|for|about|today|tomorrow)\b|[,.;]|$)",
        message,
        re.IGNORECASE,
    )
    if with_match and with_match.group(1).strip():
        return [with_match.group(1).strip()]
    return []


def _extract_subject(message: str, *, attendees: list[str]) -> str:
    about_match = re.search(
        r"\b(?:about|regarding|for)\s+(.+?)(?=\s+(?:at|on|today|tomorrow)\b|[,.;]|$)",
        message,
        re.IGNORECASE,
    )
    if about_match and about_match.group(1).strip():
        return _clean_subject(about_match.group(1))

    if attendees:
        return f"Meeting with {attendees[0]}"
    return "Meeting"


def _clean_subject(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" .,!?:;")[:120]


def _safe_zoneinfo(timezone: str) -> ZoneInfo:
    try:
        return ZoneInfo(timezone)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _is_rate_limit_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "429" in message or "rate limit" in message or "too many requests" in message
