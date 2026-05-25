from __future__ import annotations

import re
from datetime import date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.errors import ConfigurationError
from app.services.approval_service import ApprovalService
from app.services.microsoft_graph_service import MicrosoftGraphService

DEFAULT_TIMEZONE = "Asia/Kolkata"


class CalendarRescheduleService:
    async def prepare_approval(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        arguments: dict[str, Any],
        message: str,
    ) -> dict[str, Any]:
        timezone = _timezone(str(arguments.get("timezone") or DEFAULT_TIMEZONE))
        source_time_text = _string_arg(arguments, "sourceTime") or _string_arg(arguments, "currentTime")
        target_time_text = _string_arg(arguments, "targetStartTime") or _string_arg(arguments, "newStartTime")
        target_end_text = _string_arg(arguments, "targetEndTime") or _string_arg(arguments, "newEndTime")
        extracted_source, extracted_target = _extract_time_pair(message)
        source_time_text = source_time_text or extracted_source
        target_time_text = target_time_text or extracted_target

        if not target_time_text:
            raise ConfigurationError(
                "I need the new meeting time before I can prepare a reschedule approval."
            )

        day = _resolve_day(_string_arg(arguments, "date"), timezone)
        events_payload = await MicrosoftGraphService().get_calendar_for_date(
            user_id=user_id,
            workspace_id=workspace_id,
            day=day,
            timezone=timezone.key,
        )
        events = [event for event in events_payload.get("value", []) if isinstance(event, dict)]
        selected = _select_event(
            events=events,
            event_id=_string_arg(arguments, "eventId"),
            meeting_title=_string_arg(arguments, "meetingTitle"),
            source_time=_parse_time(source_time_text),
            timezone=timezone,
        )
        if not selected:
            raise ConfigurationError(
                "I could not find the meeting to reschedule. Include the meeting title or current start time."
            )

        original_start = _event_datetime(selected.get("start"), timezone)
        original_end = _event_datetime(selected.get("end"), timezone)
        if not original_start or not original_end:
            raise ConfigurationError("NexusHub could not read the selected meeting time.")

        target_start = datetime.combine(day, _parse_time(target_time_text), tzinfo=timezone)
        target_end = (
            datetime.combine(target_start.date(), _parse_time(target_end_text), tzinfo=timezone)
            if target_end_text
            else target_start + max(original_end - original_start, timedelta(minutes=30))
        )
        if target_end <= target_start:
            target_end = target_end + timedelta(days=1)

        event_id = str(selected.get("id") or selected.get("eventId") or "")
        if not event_id:
            raise ConfigurationError("The selected meeting does not include a Microsoft event id.")
        subject = str(selected.get("subject") or selected.get("title") or "Meeting")

        approval = ApprovalService().create_approval(
            user_id=user_id,
            workspace_id=workspace_id,
            tool_name="calendar_reschedule_event",
            action_type="calendar.reschedule_event",
            payload={
                "eventId": event_id,
                "subject": subject,
                "originalStart": original_start.isoformat(),
                "originalEnd": original_end.isoformat(),
                "newStart": target_start.isoformat(),
                "newEnd": target_end.isoformat(),
                "timezone": timezone.key,
                "reason": _string_arg(arguments, "reason") or message,
            },
            preview={
                "kind": "calendar_reschedule",
                "title": f"Reschedule {subject}",
                "subject": subject,
                "from": _display_range(original_start, original_end),
                "to": _display_range(target_start, target_end),
                "eventId": event_id,
            },
        )
        approval_id = str(approval.get("approval_id") or approval.get("id"))
        return {
            "approvalId": approval_id,
            "approval": approval,
            "message": f"Ready to reschedule {subject} from {_display_range(original_start, original_end)} to {_display_range(target_start, target_end)}.",
        }


def _select_event(
    *,
    events: list[dict[str, Any]],
    event_id: str | None,
    meeting_title: str | None,
    source_time: time | None,
    timezone: ZoneInfo,
) -> dict[str, Any] | None:
    candidates = events
    if event_id:
        candidates = [
            event
            for event in candidates
            if str(event.get("id") or event.get("eventId") or "") == event_id
        ]
    if meeting_title:
        normalized_title = meeting_title.lower()
        candidates = [
            event
            for event in candidates
            if normalized_title in str(event.get("subject") or event.get("title") or "").lower()
        ]
    if source_time:
        candidates = [
            event
            for event in candidates
            if (_event_datetime(event.get("start"), timezone) or datetime.min).time().replace(second=0, microsecond=0)
            == source_time
        ]
    return candidates[0] if len(candidates) == 1 else None


def _event_datetime(value: Any, timezone: ZoneInfo) -> datetime | None:
    raw: Any
    event_timezone = timezone
    if isinstance(value, dict):
        raw = value.get("dateTime")
        if value.get("timeZone"):
            event_timezone = _timezone(str(value.get("timeZone")), fallback=timezone)
    else:
        raw = value
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=event_timezone)
    return parsed.astimezone(timezone)


def _parse_time(value: str | None) -> time:
    if not value:
        raise ConfigurationError("A meeting time is required.")
    normalized = value.strip().lower().replace(".", "")
    match = re.fullmatch(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", normalized)
    if not match:
        raise ConfigurationError(f"Could not parse meeting time: {value}")
    hour = int(match.group(1))
    minute = int(match.group(2) or "0")
    period = match.group(3)
    if period == "pm" and hour != 12:
        hour += 12
    if period == "am" and hour == 12:
        hour = 0
    if hour > 23 or minute > 59:
        raise ConfigurationError(f"Could not parse meeting time: {value}")
    return time(hour=hour, minute=minute)


def _resolve_day(value: str | None, timezone: ZoneInfo) -> date:
    if not value or value.strip().lower() == "today":
        return datetime.now(timezone).date()
    if value.strip().lower() == "tomorrow":
        return datetime.now(timezone).date() + timedelta(days=1)
    try:
        return date.fromisoformat(value[:10])
    except ValueError as exc:
        raise ConfigurationError("Use an ISO date like 2026-05-25 for the meeting date.") from exc


def _extract_time_pair(message: str) -> tuple[str | None, str | None]:
    match = re.search(
        r"(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|->)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)",
        message,
        flags=re.IGNORECASE,
    )
    if not match:
        return None, None
    return match.group(1), match.group(2)


def _timezone(value: str, fallback: ZoneInfo | None = None) -> ZoneInfo:
    try:
        return ZoneInfo(value)
    except ZoneInfoNotFoundError:
        if fallback:
            return fallback
        raise ConfigurationError(f"Unsupported timezone: {value}")


def _display_range(start: datetime, end: datetime) -> str:
    return f"{start.strftime('%b %d, %I:%M %p')} - {end.strftime('%I:%M %p')}"


def _string_arg(arguments: dict[str, Any], key: str) -> str | None:
    value = arguments.get(key)
    if value is None:
        return None
    text = str(value).strip()
    return text or None
