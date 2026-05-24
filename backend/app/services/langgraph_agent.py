from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.core.logging import get_logger
from app.services.mcp_client import call_tool
from app.services.openai_llm_service import OpenAILLMService

logger = get_logger(__name__)


TOOL_DESCRIPTIONS: dict[str, str] = {
    "direct_response": "Answer greetings, capability questions, or small talk without calling MCP.",
    "auth_get_status": "Check whether Microsoft 365 is connected.",
    "mail_find_needs_reply": "Find Outlook emails likely requiring a reply.",
    "mail_find_awaiting_approval": "Find emails that mention approvals, reviews, contracts, budgets, or invoices.",
    "mail_summarize_thread": "Summarize an email thread when a messageId or threadId is available.",
    "mail_create_draft_reply": "Prepare an approval-gated draft email reply. Never sends email.",
    "mail_mark_as_read": "Prepare an approval-gated request to mark selected emails as read.",
    "calendar_get_today_agenda": "Get today's Outlook calendar agenda.",
    "calendar_find_focus_blocks": "Suggest focus blocks from the calendar.",
    "calendar_prepare_meeting_brief": "Prepare a brief for an upcoming meeting.",
    "docs_list_recent_files": "List recent OneDrive or SharePoint files.",
    "docs_analyze_uploaded_file": "Analyze an uploaded or mock file by filename.",
    "docs_build_report": "Build a report outline from a document by filename.",
    "teams_get_urgent_mentions": "Find urgent Teams mentions. Graph mode may return not implemented.",
    "teams_get_meeting_summaries": "Return recent Teams meeting summaries. Graph mode may return fallback.",
    "teams_extract_action_items": "Extract action items from supplied Teams/chat text.",
    "approval_list_pending": "List pending approval-gated actions.",
}

TOOL_ARGUMENT_KEYS: dict[str, set[str]] = {
    "direct_response": {"message"},
    "auth_get_status": set(),
    "mail_find_needs_reply": {"days", "maxResults", "priority"},
    "mail_find_awaiting_approval": {"days", "maxResults"},
    "mail_summarize_thread": {"threadId", "messageId"},
    "mail_create_draft_reply": {"to", "subject", "context", "tone", "intent"},
    "mail_mark_as_read": {"messageIds"},
    "calendar_get_today_agenda": {"timezone"},
    "calendar_find_focus_blocks": {"date", "timezone", "minBlockMinutes"},
    "calendar_prepare_meeting_brief": {"eventId", "meetingTitle"},
    "docs_list_recent_files": {"maxResults"},
    "docs_analyze_uploaded_file": {"fileName", "analysisGoal"},
    "docs_build_report": {"fileName", "reportType", "audience"},
    "teams_get_urgent_mentions": {"days", "maxResults"},
    "teams_get_meeting_summaries": {"days", "maxResults"},
    "teams_extract_action_items": {"text"},
    "approval_list_pending": {"maxResults"},
}

REQUIRED_ARGUMENTS: dict[str, set[str]] = {
    "mail_create_draft_reply": {"to", "subject", "context"},
    "mail_mark_as_read": {"messageIds"},
    "docs_analyze_uploaded_file": {"fileName"},
    "docs_build_report": {"fileName"},
    "teams_extract_action_items": {"text"},
}


class AgentState(TypedDict, total=False):
    user_id: str
    workspace_id: str | None
    message: str
    selected_tool: str
    tool_args: dict[str, Any]
    tool_result: dict[str, Any]
    routing_source: str
    agent_reason: str
    final: dict[str, Any]


class LangGraphAgent:
    def __init__(self, llm: OpenAILLMService | None = None) -> None:
        self._llm = llm or OpenAILLMService()
        self._graph = self._build_graph()

    async def chat(
        self, *, user_id: str, workspace_id: str | None, message: str
    ) -> dict[str, Any]:
        state = await self._graph.ainvoke(
            {"user_id": user_id, "workspace_id": workspace_id, "message": message}
        )
        return state["final"]

    def _build_graph(self):
        graph = StateGraph(AgentState)
        graph.add_node("select_tool", self._select_tool)
        graph.add_node("call_tool", self._call_selected_tool)
        graph.add_node("format_response", self._format_response)
        graph.set_entry_point("select_tool")
        graph.add_edge("select_tool", "call_tool")
        graph.add_edge("call_tool", "format_response")
        graph.add_edge("format_response", END)
        return graph.compile()

    async def _select_tool(self, state: AgentState) -> dict[str, Any]:
        message = state["message"]
        try:
            selection = await self._llm.complete_json(
                system_prompt=self._system_prompt(),
                user_prompt=f"User message: {message}",
            )
            selected_tool = self._normalize_tool(str(selection.get("tool_name") or ""))
            tool_args = self._sanitize_args(
                selected_tool, selection.get("arguments") or {}, message
            )
            if self._missing_required_args(selected_tool, tool_args):
                selected_tool = self._fallback_tool(message)
                tool_args = {}
            reason = str(selection.get("reason") or "Selected by OpenAI LLM.")
            return {
                "selected_tool": selected_tool,
                "tool_args": tool_args,
                "routing_source": "openai_langgraph",
                "agent_reason": reason[:500],
            }
        except Exception as exc:
            logger.warning(
                "LLM tool selection failed; using rule-based fallback.",
                extra={
                    "metadata": {
                        "errorType": type(exc).__name__,
                        "messageLength": len(message),
                    }
                },
            )
            selected_tool = self._fallback_tool(message)
            return {
                "selected_tool": selected_tool,
                "tool_args": {},
                "routing_source": "rule_based_fallback",
                "agent_reason": "OpenAI routing failed, so NexusHub used the local fallback router.",
            }

    async def _call_selected_tool(self, state: AgentState) -> dict[str, Any]:
        if state["selected_tool"] == "direct_response":
            message = str(
                state.get("tool_args", {}).get("message")
                or "Hi. I can help with your mail, calendar, Teams activity, documents, and pending approvals."
            )
            return {
                "tool_result": {
                    "ok": True,
                    "source": "agent",
                    "data": {"message": message},
                }
            }
        arguments = {
            "user_id": state["user_id"],
            "workspace_id": state.get("workspace_id"),
            **state.get("tool_args", {}),
        }
        result = await call_tool(state["selected_tool"], arguments)
        tool_result = result.get("result") if isinstance(result, dict) else result
        return {"tool_result": tool_result if isinstance(tool_result, dict) else {"data": tool_result}}

    async def _format_response(self, state: AgentState) -> dict[str, Any]:
        tool_result = state.get("tool_result") or {}
        if isinstance(tool_result, dict) and tool_result.get("status") == "authentication_required":
            return {
                "final": {
                    "type": "connect_required",
                    "provider": "microsoft",
                    "connect_url": "/auth/microsoft/start",
                    "message": "Please connect Microsoft 365 first.",
                    "agent": {
                        "mode": "langgraph",
                        "routing_source": state.get("routing_source"),
                    },
                }
            }

        return {
            "final": {
                "type": "agent_response",
                "tool_used": state.get("selected_tool"),
                "data": tool_result,
                "agent": {
                    "mode": "langgraph",
                    "routing_source": state.get("routing_source"),
                    "reason": state.get("agent_reason"),
                },
            }
        }

    def _system_prompt(self) -> str:
        tool_lines = "\n".join(
            f"- {name}: {description}" for name, description in TOOL_DESCRIPTIONS.items()
        )
        return f"""You are NexusHub's backend routing agent.
Select exactly one MCP tool for the user's request.
Return strict JSON only, with no markdown.

Available tools:
{tool_lines}

JSON shape:
{{
  "tool_name": "one_available_tool_name",
  "arguments": {{}},
  "reason": "short routing reason"
}}

Rules:
- Include only tool-specific arguments. Do not include user_id or workspace_id.
- For greetings, small talk, or questions about what NexusHub can do, choose direct_response.
- Prefer read-only tools unless the user clearly asks to prepare a write action.
- Write tools are approval-gated and must never be described as already executed.
- Use camelCase argument names exactly as the MCP tools expect.
- If the request is unclear but not a greeting, choose auth_get_status."""

    def _normalize_tool(self, tool_name: str) -> str:
        if tool_name in TOOL_DESCRIPTIONS:
            return tool_name
        return "mail_find_needs_reply"

    def _sanitize_args(
        self, tool_name: str, raw_args: Any, original_message: str
    ) -> dict[str, Any]:
        if not isinstance(raw_args, dict):
            return {}
        allowed = TOOL_ARGUMENT_KEYS.get(tool_name, set())
        sanitized = {key: value for key, value in raw_args.items() if key in allowed}
        sanitized.pop("user_id", None)
        sanitized.pop("workspace_id", None)

        missing_required = REQUIRED_ARGUMENTS.get(tool_name, set()) - set(sanitized)
        if missing_required and tool_name == "teams_extract_action_items":
            sanitized["text"] = original_message
            missing_required = REQUIRED_ARGUMENTS[tool_name] - set(sanitized)
        if missing_required:
            return {}
        return sanitized

    def _missing_required_args(self, tool_name: str, args: dict[str, Any]) -> bool:
        required = REQUIRED_ARGUMENTS.get(tool_name, set())
        return bool(required - set(args))

    def _fallback_tool(self, message: str) -> str:
        lowered = message.lower()
        if _is_greeting_or_smalltalk(lowered):
            return "direct_response"
        if "approval" in lowered:
            return "approval_list_pending"
        if "agenda" in lowered or "calendar" in lowered or "today" in lowered:
            return "calendar_get_today_agenda"
        if "file" in lowered or "document" in lowered or "onedrive" in lowered:
            return "docs_list_recent_files"
        if "team" in lowered or "mention" in lowered:
            return "teams_get_urgent_mentions"
        return "mail_find_needs_reply"


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
        "what can you do",
        "help",
    }
