from __future__ import annotations

from typing import Any

from nexushub_mcp.clients.backend_internal_client import BackendInternalClientError
from nexushub_mcp.mock import mock_calendar
from nexushub_mcp.server.context import NexusHubRuntime
from nexushub_mcp.tools.common import ensure_user_id
from nexushub_mcp.utils.logger import get_logger, log_tool_call
from nexushub_mcp.utils.response import ok

logger = get_logger(__name__)


def register_calendar_tools(mcp: Any, runtime: NexusHubRuntime) -> None:
    @mcp.tool(description="Get today's calendar agenda.")
    async def calendar_get_today_agenda(
        user_id: str | None = None,
        workspace_id: str | None = None,
        timezone: str = "Asia/Kolkata",
    ) -> dict[str, Any]:
        log_tool_call(
            logger, "calendar_get_today_agenda", {"timezone": timezone, "hasUserId": bool(user_id)}
        )
        if runtime.settings.mode == "mock":
            return ok("mock", mock_calendar.today_agenda(timezone=timezone))
        missing = ensure_user_id(runtime.settings.mode, user_id)
        if missing:
            return missing
        try:
            data = await runtime.backend_client.get_today_calendar(
                user_id=user_id or "", workspace_id=workspace_id
            )
        except BackendInternalClientError as exc:
            return exc.to_mcp_response()
        return ok("microsoft_graph", data.get("data") or data)

    @mcp.tool(description="Suggest focus blocks based on the user's calendar.")
    async def calendar_find_focus_blocks(
        user_id: str | None = None,
        workspace_id: str | None = None,
        date: str | None = None,
        timezone: str = "Asia/Kolkata",
        minBlockMinutes: int = 45,
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "calendar_find_focus_blocks",
            {
                "hasDate": bool(date),
                "timezone": timezone,
                "minBlockMinutes": minBlockMinutes,
                "hasUserId": bool(user_id),
            },
        )
        min_block_minutes = max(15, min(minBlockMinutes, 240))
        if runtime.settings.mode == "mock":
            return ok(
                "mock",
                mock_calendar.focus_blocks(
                    date=date, timezone=timezone, min_block_minutes=min_block_minutes
                ),
            )
        # MVP: derive focus blocks from today's backend calendar response in graph mode.
        missing = ensure_user_id(runtime.settings.mode, user_id)
        if missing:
            return missing
        try:
            data = await runtime.backend_client.get_today_calendar(
                user_id=user_id or "", workspace_id=workspace_id
            )
        except BackendInternalClientError as exc:
            return exc.to_mcp_response()
        events = list((data.get("data") or data).get("value", []))
        return ok(
            "microsoft_graph",
            {
                "date": date,
                "timezone": timezone,
                "minBlockMinutes": min_block_minutes,
                "suggestedBlocks": [],
                "reasoning": f"Received {len(events)} calendar events. Focus block derivation will be expanded in the backend orchestrator.",
            },
        )

    @mcp.tool(description="Prepare a brief for an upcoming meeting.")
    async def calendar_prepare_meeting_brief(
        user_id: str | None = None,
        workspace_id: str | None = None,
        eventId: str | None = None,
        meetingTitle: str | None = None,
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "calendar_prepare_meeting_brief",
            {
                "hasEventId": bool(eventId),
                "hasMeetingTitle": bool(meetingTitle),
                "hasUserId": bool(user_id),
            },
        )
        if runtime.settings.mode == "mock":
            return ok(
                "mock", mock_calendar.meeting_brief(event_id=eventId, meeting_title=meetingTitle)
            )
        missing = ensure_user_id(runtime.settings.mode, user_id)
        if missing:
            return missing
        try:
            data = await runtime.backend_client.get_today_calendar(
                user_id=user_id or "", workspace_id=workspace_id
            )
        except BackendInternalClientError as exc:
            return exc.to_mcp_response()
        events = list((data.get("data") or data).get("value", []))
        selected = next((event for event in events if event.get("id") == eventId), None)
        if not selected and meetingTitle:
            selected = next(
                (
                    event
                    for event in events
                    if meetingTitle.lower() in str(event.get("subject", "")).lower()
                ),
                None,
            )
        selected = selected or (events[0] if events else {})
        return ok(
            "microsoft_graph",
            {
                "eventId": selected.get("id"),
                "meetingSummary": {
                    "title": selected.get("subject") or meetingTitle,
                    "start": selected.get("start"),
                    "end": selected.get("end"),
                    "bodyPreview": selected.get("bodyPreview"),
                },
                "attendees": selected.get("attendees", []),
                "relatedContext": [
                    "Graph mode meeting briefs currently use calendar metadata from the backend."
                ],
                "openQuestions": ["What decision is needed?", "Who owns follow-up actions?"],
                "suggestedTalkingPoints": [
                    "Confirm objective.",
                    "Review open risks.",
                    "Close with owners and due dates.",
                ],
            },
        )
