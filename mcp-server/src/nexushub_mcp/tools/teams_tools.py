from __future__ import annotations

import re
from typing import Any

from nexushub_mcp.mock import mock_teams
from nexushub_mcp.server.context import NexusHubRuntime
from nexushub_mcp.tools.common import not_implemented
from nexushub_mcp.utils.logger import get_logger, log_tool_call
from nexushub_mcp.utils.response import ok

logger = get_logger(__name__)

ACTION_PATTERNS = ("will", "need to", "needs to", "action", "follow up", "by friday", "owner")


def register_teams_tools(mcp: Any, runtime: NexusHubRuntime) -> None:
    @mcp.tool(description="Find urgent Teams mentions or channel messages requiring attention.")
    async def teams_get_urgent_mentions(days: int = 3, maxResults: int = 10) -> dict[str, Any]:
        log_tool_call(logger, "teams_get_urgent_mentions", {"days": days, "maxResults": maxResults})
        days = max(1, min(days, 30))
        max_results = max(1, min(maxResults, 50))
        if runtime.settings.mode == "mock":
            return ok("mock", mock_teams.urgent_mentions(days=days, max_results=max_results))
        return not_implemented("Teams urgent mentions are now fetched directly by the Command Center backend.")

    @mcp.tool(description="Return recent Teams meeting summaries and action items.")
    async def teams_get_meeting_summaries(days: int = 7, maxResults: int = 5) -> dict[str, Any]:
        log_tool_call(
            logger, "teams_get_meeting_summaries", {"days": days, "maxResults": maxResults}
        )
        days = max(1, min(days, 60))
        max_results = max(1, min(maxResults, 20))
        if runtime.settings.mode == "mock":
            return ok("mock", mock_teams.meeting_summaries(days=days, max_results=max_results))
        return not_implemented("Teams transcript integration is not enabled. Transcript summaries require additional admin-approved Microsoft Graph permissions.")

    @mcp.tool(description="Extract action items from Teams meeting or chat text with simple rules.")
    async def teams_extract_action_items(text: str) -> dict[str, Any]:
        log_tool_call(logger, "teams_extract_action_items", {"textLength": len(text)})
        items = extract_action_items_from_text(text)
        return ok(runtime.settings.source, {"count": len(items), "actionItems": items})


def extract_action_items_from_text(text: str) -> list[dict[str, Any]]:
    sentences = [segment.strip(" -\t") for segment in re.split(r"[\n.;]+", text) if segment.strip()]
    items: list[dict[str, Any]] = []
    for sentence in sentences:
        lowered = sentence.lower()
        if not any(pattern in lowered for pattern in ACTION_PATTERNS):
            continue
        owner = _extract_owner(sentence)
        due_date = _extract_due_date(sentence)
        confidence = 0.55
        if owner:
            confidence += 0.2
        if due_date:
            confidence += 0.15
        if "action" in lowered or "follow up" in lowered:
            confidence += 0.1
        items.append(
            {
                "task": _normalize_task(sentence),
                "owner": owner,
                "dueDate": due_date,
                "confidence": round(min(confidence, 0.95), 2),
            }
        )
    return items[:20]


def _extract_owner(sentence: str) -> str | None:
    explicit = re.search(r"\bowner\s*[:=-]\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)", sentence)
    if explicit:
        return explicit.group(1).strip()
    leading = re.search(
        r"\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+(?:will|needs to|need to)\b", sentence
    )
    if leading:
        return leading.group(1).strip()
    return None


def _extract_due_date(sentence: str) -> str | None:
    match = re.search(
        r"\bby\s+((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|(?:tomorrow|today)|(?:\d{1,2}/\d{1,2})|(?:[A-Z][a-z]{2,8}\s+\d{1,2}))\b",
        sentence,
        re.IGNORECASE,
    )
    return match.group(1) if match else None


def _normalize_task(sentence: str) -> str:
    normalized = re.sub(
        r"\bowner\s*[:=-]\s*[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?", "", sentence
    ).strip()
    return normalized[0].upper() + normalized[1:] if normalized else sentence
