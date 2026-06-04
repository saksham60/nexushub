from __future__ import annotations

import asyncio
import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Query

from app.core.errors import NexusHubError, ConsentRequiredError
from app.services.approval_service import ApprovalService
from app.services.mcp_client import call_tool
from app.services.microsoft_connection_service import MicrosoftConnectionService
from app.services.microsoft_graph_service import MicrosoftGraphService

router = APIRouter(prefix="/api/command-center", tags=["command-center"])
DEFAULT_TIMEZONE = "Asia/Kolkata"
TIMEZONE_ALIASES = {"Asia/Calcutta": "Asia/Kolkata"}


@router.get("/feed")
async def feed(
    user_id: str = Query(...),
    workspace_id: str | None = None,
    timezone: str = Query(DEFAULT_TIMEZONE),
) -> dict[str, Any]:
    mailbox_email: str | None = None
    source_errors: dict[str, str] = {}
    items: list[dict[str, Any]] = []
    health = {"backend": "ok", "mcp": "ok", "microsoft": "connected"}
    status_counts: dict[str, int] = {}
    dashboard_timezone = _normalize_timezone(timezone)

    microsoft_status = MicrosoftConnectionService().get_status(user_id=user_id)
    if not microsoft_status.get("connected"):
        health["microsoft"] = "disconnected"
        return _feed_response(
            mailbox_email=None,
            health=health,
            items=[],
            source_errors=source_errors,
        )

    mailbox_email = str(microsoft_status.get("email") or "")

    results = await asyncio.gather(
        _safe_tool(
            "mail",
            "mail_find_needs_reply",
            {"user_id": user_id, "workspace_id": workspace_id, "maxResults": 10},
        ),
        _safe_tool(
            "calendar",
            "calendar_get_today_agenda",
            {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "timezone": dashboard_timezone,
            },
        ),
        _safe_tool(
            "documents",
            "docs_list_recent_files",
            {"user_id": user_id, "workspace_id": workspace_id, "maxResults": 10},
        ),
        _safe_approvals(user_id=user_id, workspace_id=workspace_id),
        _safe_teams(user_id=user_id, workspace_id=workspace_id),
        _safe_mail_status(user_id=user_id, workspace_id=workspace_id),
        _safe_calendar_status(
            user_id=user_id,
            workspace_id=workspace_id,
            timezone=dashboard_timezone,
        ),
    )

    for source, payload, error, error_kind in results:
        if error:
            if error_kind == "status_optional":
                continue
            if error_kind == "teams_unsupported":
                continue # Do not surface Teams API block as an error
            source_errors[source] = error
            if error_kind == "auth":
                health["microsoft"] = "disconnected"
            elif source in {"mail", "calendar", "documents"}:
                health["mcp"] = "error" if health["mcp"] != "ok" else "partial"
            continue
        if source == "mail":
            items.extend(_mail_items(payload, mailbox_email=mailbox_email))
        elif source == "calendar":
            items.extend(_calendar_items(payload, priority="high"))
        elif source == "documents":
            items.extend(_document_items(payload))
        elif source == "approvals":
            items.extend(_approval_items(payload))
        elif source == "teams":
            items.extend(_team_items(payload))
        elif source == "mail_status":
            status_counts["unreadEmail"] = _unread_email_count(payload)
            items.extend(_unread_mail_items(payload, mailbox_email=mailbox_email))
        elif source == "calendar_status":
            status_counts["upcomingMeetings"] = _calendar_event_count(payload)
            status_counts["meetingsToday"] = _today_calendar_count(
                payload, timezone=dashboard_timezone
            )
            items.extend(_calendar_items(payload, priority="medium"))

    items = _dedupe_items(items)
    if health["microsoft"] != "disconnected" and any(
        _is_microsoft_auth_error(error) for error in source_errors.values()
    ):
        health["microsoft"] = "error"

    return _feed_response(
        mailbox_email=mailbox_email,
        health=health,
        items=items,
        source_errors=source_errors,
        status_counts=status_counts,
    )


async def _safe_tool(
    source: str, tool_name: str, arguments: dict[str, Any]
) -> tuple[str, dict[str, Any], str | None, str | None]:
    try:
        result = await call_tool(tool_name, arguments)
        tool_result = result.get("result") if isinstance(result, dict) else result
        if not isinstance(tool_result, dict):
            return source, {}, "MCP returned an invalid response.", "mcp"
        if tool_result.get("status") == "authentication_required":
            return (
                source,
                {},
                str(tool_result.get("message") or "Microsoft 365 authentication is required."),
                "auth",
            )
        if tool_result.get("ok") is False:
            error = tool_result.get("error") or {}
            message = str(error.get("message") or "MCP tool call failed.")
            error_code = str(error.get("code") or "")
            return source, {}, message, "auth" if _is_microsoft_auth_error(message, error_code) else "mcp"
        return source, tool_result.get("data") or tool_result, None, None
    except Exception as exc:
        return source, {}, str(exc), "mcp"


async def _safe_approvals(
    *, user_id: str, workspace_id: str | None
) -> tuple[str, dict[str, Any], str | None, str | None]:
    try:
        return (
            "approvals",
            ApprovalService().list_pending(
                user_id=user_id, workspace_id=workspace_id, max_results=20
            ),
            None,
            None,
        )
    except NexusHubError as exc:
        return "approvals", {}, exc.message, None
    except Exception as exc:
        return "approvals", {}, str(exc), None


async def _safe_teams(
    *, user_id: str, workspace_id: str | None
) -> tuple[str, dict[str, Any], str | None, str | None]:
    try:
        service = MicrosoftGraphService()
        chats = await service.get_recent_teams_chats(user_id=user_id, workspace_id=workspace_id)
        return "teams", chats, None, None
    except ConsentRequiredError as exc:
        return "teams", {}, exc.message, "teams_unsupported"
    except Exception as exc:
        if "Personal accounts are not supported" in str(exc) or "auth" in str(exc).lower() or "401" in str(exc) or "403" in str(exc):
            return "teams", {}, str(exc), "teams_unsupported"
        return "teams", {}, str(exc), None


async def _safe_mail_status(
    *, user_id: str, workspace_id: str | None
) -> tuple[str, dict[str, Any], str | None, str | None]:
    try:
        service = MicrosoftGraphService()
        unread = await service.get_unread_messages(
            user_id=user_id, workspace_id=workspace_id, top=50
        )
        return "mail_status", unread, None, None
    except Exception as exc:
        return "mail_status", {}, str(exc), "status_optional"


async def _safe_calendar_status(
    *, user_id: str, workspace_id: str | None, timezone: str
) -> tuple[str, dict[str, Any], str | None, str | None]:
    try:
        service = MicrosoftGraphService()
        events = await service.get_calendar_range(
            user_id=user_id,
            workspace_id=workspace_id,
            days=7,
            timezone=timezone,
            top=50,
        )
        return "calendar_status", events, None, None
    except Exception as exc:
        return "calendar_status", {}, str(exc), "status_optional"


def _feed_response(
    *,
    mailbox_email: str | None,
    health: dict[str, str],
    items: list[dict[str, Any]],
    source_errors: dict[str, str],
    status_counts: dict[str, int] | None = None,
) -> dict[str, Any]:
    status_counts = status_counts or {}
    replies_needed = _reply_needed_count(items)
    unread_email = status_counts.get("unreadEmail", _unread_item_count(items) or replies_needed)
    calendar_count = sum(1 for item in items if item["type"] == "calendar")
    meetings_today = status_counts.get("meetingsToday", calendar_count)
    upcoming_meetings = status_counts.get("upcomingMeetings", calendar_count)
    return {
        "mailboxEmail": mailbox_email,
        "health": health,
        "counts": {
            "repliesNeeded": replies_needed,
            "unreadEmail": unread_email,
            "meetingsToday": meetings_today,
            "upcomingMeetings": upcoming_meetings,
            "approvalsPending": sum(1 for item in items if item["type"] == "approval"),
            "filesToReview": sum(1 for item in items if item["type"] == "document"),
            "teamsMentions": sum(1 for item in items if item["type"] == "team"),
            "aiSuggestions": _ai_suggestion_count(items),
        },
        "topInsight": _top_insight(items),
        "items": items,
        "errors": source_errors,
    }


def _unread_email_count(payload: dict[str, Any]) -> int:
    messages = payload.get("value")
    if not isinstance(messages, list):
        return 0
    return sum(1 for message in messages if isinstance(message, dict) and message.get("isRead") is False)


def _calendar_event_count(payload: dict[str, Any]) -> int:
    return len(_raw_calendar_events(payload))


def _today_calendar_count(payload: dict[str, Any], *, timezone: str) -> int:
    tz = ZoneInfo(_normalize_timezone(timezone))
    today = datetime.now(tz).date()
    total = 0
    for event in _raw_calendar_events(payload):
        start = _event_start_datetime(event, timezone=timezone)
        if start and start.astimezone(tz).date() == today:
            total += 1
    return total


def _reply_needed_count(items: list[dict[str, Any]]) -> int:
    total = 0
    for item in items:
        if item.get("type") != "email":
            continue
        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        if metadata.get("requiresReply") is True:
            total += 1
            continue
        if "requiresReply" not in metadata and item.get("primaryActionLabel") == "Draft Reply":
            total += 1
    return total


def _unread_item_count(items: list[dict[str, Any]]) -> int:
    total = 0
    for item in items:
        if item.get("type") != "email":
            continue
        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        if metadata.get("isRead") is False:
            total += 1
    return total


def _dedupe_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        item_id = str(item.get("id") or "")
        if not item_id or item_id in seen:
            continue
        seen.add(item_id)
        deduped.append(item)
    return deduped


def _ai_suggestion_count(items: list[dict[str, Any]]) -> int:
    actionable = [item for item in items if item.get("primaryActionLabel")]
    return min(max(len(actionable), 0), 3)


def _top_insight(items: list[dict[str, Any]]) -> dict[str, str]:
    high_count = sum(1 for item in items if item.get("priority") == "high")
    time_sensitive = high_count or sum(1 for item in items if item["type"] in {"email", "approval", "team"})
    if time_sensitive:
        return {
            "title": f"{time_sensitive} time-sensitive item{'s' if time_sensitive != 1 else ''} require attention today.",
            "description": _insight_description(items),
        }
    return {
        "title": "No time-sensitive decisions are waiting right now.",
        "description": "Your priority feed is clear. NexusHub will surface new decisions as they arrive.",
    }


def _insight_description(items: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    email_count = _reply_needed_count(items)
    unread_count = _unread_item_count(items)
    approval_count = sum(1 for item in items if item["type"] == "approval")
    document_count = sum(1 for item in items if item["type"] == "document")
    team_count = sum(1 for item in items if item["type"] == "team")
    if email_count:
        parts.append(f"{email_count} email{'s' if email_count != 1 else ''} may need a reply")
    elif unread_count:
        parts.append(f"{unread_count} unread email{'s' if unread_count != 1 else ''} are waiting")
    if approval_count:
        parts.append(f"{approval_count} approval{'s' if approval_count != 1 else ''} are pending")
    if document_count:
        parts.append(f"{document_count} file{'s' if document_count != 1 else ''} are ready for review")
    if team_count:
        parts.append(f"{team_count} Teams message{'s' if team_count != 1 else ''} require attention")
    return "; ".join(parts) + "." if parts else "No urgent Microsoft 365 activity was found."


def _team_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    chats = payload.get("value")
    if not isinstance(chats, list):
        return []
        
    items: list[dict[str, Any]] = []
    for chat in chats:
        if not isinstance(chat, dict):
            continue
            
        last_msg = chat.get("lastMessagePreview")
        if not isinstance(last_msg, dict):
            continue
            
        body_content = last_msg.get("body", {}).get("content") or last_msg.get("bodyPreview") or ""
        body_preview = re.sub(r'<[^>]+>', '', str(body_content)).strip()
        if not body_preview:
            continue
            
        normalized = body_preview.lower()
        is_urgent_keyword = any(kw in normalized for kw in ["urgent", "asap", "blocker", "approval", "review", "deadline"])
        is_mention = "@" in normalized
        chat_type = str(chat.get("chatType") or "")
        is_direct = chat_type.lower() in ["onetoone"]
        
        created_dt_str = last_msg.get("createdDateTime")
        read_dt_str = chat.get("viewpoint", {}).get("lastMessageReadDateTime")
        is_unread = True
        if created_dt_str and read_dt_str:
            try:
                is_unread = created_dt_str > read_dt_str
            except Exception:
                pass

        score = 0
        if is_mention: score += 3
        if is_direct: score += 2
        if is_urgent_keyword: score += 2
        if is_unread: score += 1

        if score < 2:
            continue
            
        priority = "low"
        if score >= 5: priority = "high"
        elif score >= 3: priority = "medium"
            
        chat_id = str(chat.get("id") or "")
        msg_id = str(last_msg.get("id") or "")
        topic = str(chat.get("topic") or "Teams Chat")
        
        sender_obj = last_msg.get("from")
        sender_name = "Someone"
        if isinstance(sender_obj, dict):
            user_obj = sender_obj.get("user")
            if isinstance(user_obj, dict):
                sender_name = str(user_obj.get("displayName") or sender_name)
                
        if len(body_preview) > 150:
            body_preview = body_preview[:147] + "..."
                
        items.append({
            "id": f"team_{msg_id or chat_id}",
            "type": "team",
            "title": topic,
            "description": body_preview,
            "source": "Microsoft Teams",
            "person": sender_name,
            "timeLabel": _date_label(created_dt_str),
            "priority": priority,
            "status": "new",
            "primaryActionLabel": "Review",
            "metadata": {
                "chatId": chat_id,
                "messageId": msg_id,
                "from": sender_name,
                "createdDateTime": created_dt_str,
                "bodyPreview": body_preview,
                "webUrl": chat.get("webUrl"),
                "isMention": is_mention,
                "isUrgent": is_urgent_keyword,
                "isUnread": is_unread,
                "score": score
            }
        })
    return items


def _mail_items(payload: dict[str, Any], *, mailbox_email: str) -> list[dict[str, Any]]:
    groups = payload.get("groups") if isinstance(payload.get("groups"), list) else []
    action_items: list[dict[str, Any]] = []
    for group in groups:
        if not isinstance(group, dict):
            continue
        for item in group.get("items") or []:
            if not isinstance(item, dict):
                continue
            message_id = str(item.get("messageId") or "")
            if not message_id:
                continue
            subject = str(item.get("subject") or "(No subject)")
            sender_email = str(item.get("senderEmail") or item.get("sender") or "")
            reply_to = item.get("replyTo") if isinstance(item.get("replyTo"), list) else []
            received_at = item.get("receivedAt")
            action_items.append(
                {
                    "id": f"mail_{message_id}",
                    "type": "email",
                    "title": subject,
                    "description": item.get("preview") or "",
                    "source": "Outlook",
                    "person": item.get("sender") or sender_email,
                    "timeLabel": _date_label(received_at),
                    "priority": _priority(item.get("urgency")),
                    "status": "new",
                    "primaryActionLabel": "Draft Reply",
                    "metadata": {
                        "messageId": message_id,
                        "conversationId": item.get("threadId"),
                        "subject": subject,
                        "from": sender_email,
                        "senderAddress": item.get("senderAddress") or sender_email,
                        "replyTo": reply_to,
                        "to": item.get("to") or [],
                        "receivedDateTime": received_at,
                        "bodyPreview": item.get("preview") or "",
                        "body": item.get("body") or "",
                        "webLink": item.get("webLink"),
                        "mailboxEmail": mailbox_email,
                        "reason": item.get("reason"),
                        "requiresReply": True,
                        "isRead": item.get("isRead"),
                    },
                }
            )
    return action_items


def _unread_mail_items(payload: dict[str, Any], *, mailbox_email: str) -> list[dict[str, Any]]:
    raw_messages = payload.get("value")
    if not isinstance(raw_messages, list):
        return []

    items: list[dict[str, Any]] = []
    for message in raw_messages:
        if not isinstance(message, dict):
            continue
        message_id = str(message.get("id") or "")
        if not message_id:
            continue
        if message.get("isRead") is not False:
            continue

        subject = str(message.get("subject") or "(No subject)")
        sender_name = _email_name(message.get("from")) or _email_address(message.get("from"))
        sender_email = _email_address(message.get("from"))
        received_at = message.get("receivedDateTime")
        body_preview = str(message.get("bodyPreview") or "")
        importance = str(message.get("importance") or "").lower()
        items.append(
            {
                "id": f"mail_{message_id}",
                "type": "email",
                "title": subject,
                "description": body_preview,
                "source": "Outlook",
                "person": sender_name or sender_email,
                "timeLabel": _date_label(received_at),
                "priority": "high" if importance == "high" else "medium",
                "status": "new",
                "primaryActionLabel": "Review Email",
                "metadata": {
                    "messageId": message_id,
                    "conversationId": message.get("conversationId"),
                    "subject": subject,
                    "from": sender_email,
                    "senderAddress": sender_email,
                    "replyTo": _recipient_addresses(message.get("replyTo")),
                    "to": _recipient_addresses(message.get("toRecipients")),
                    "receivedDateTime": received_at,
                    "bodyPreview": body_preview,
                    "body": _message_body(message.get("body")),
                    "webLink": message.get("webLink"),
                    "mailboxEmail": mailbox_email,
                    "importance": message.get("importance"),
                    "isRead": message.get("isRead"),
                    "requiresReply": False,
                },
            }
        )
    return items


def _calendar_items(payload: dict[str, Any], *, priority: str = "high") -> list[dict[str, Any]]:
    raw_events = _raw_calendar_events(payload)
    items: list[dict[str, Any]] = []
    for event in raw_events:
        if not isinstance(event, dict):
            continue
        event_id = str(event.get("id") or event.get("eventId") or "")
        subject = str(event.get("subject") or event.get("title") or "(Untitled event)")
        start = _date_value(event.get("start"))
        organizer = event.get("organizer")
        fallback_id = f"{subject}_{start or ''}".strip("_")
        items.append(
            {
                "id": f"cal_{event_id or fallback_id}",
                "type": "calendar",
                "title": subject,
                "description": _location_label(event.get("location")),
                "source": "Calendar",
                "person": _organizer_label(organizer),
                "timeLabel": _time_label(start),
                "priority": _priority(priority),
                "status": "pending",
                "primaryActionLabel": "Prepare",
                "metadata": event,
            }
        )
    return items


def _document_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_files = payload.get("value")
    if not isinstance(raw_files, list):
        raw_files = payload.get("items") if isinstance(payload.get("items"), list) else []
    items: list[dict[str, Any]] = []
    for file in raw_files:
        if not isinstance(file, dict):
            continue
        file_id = str(file.get("id") or file.get("fileId") or "")
        name = str(file.get("name") or "(Untitled file)")
        size = file.get("size") or file.get("sizeBytes") or 0
        items.append(
            {
                "id": f"doc_{file_id or name}",
                "type": "document",
                "title": name,
                "description": f"{round(int(size or 0) / 1000)} KB",
                "source": "OneDrive",
                "priority": "low",
                "status": "new",
                "primaryActionLabel": "Summarize",
                "metadata": file,
            }
        )
    return items


def _approval_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows = payload.get("items") if isinstance(payload.get("items"), list) else []
    items: list[dict[str, Any]] = []
    for approval in rows:
        if not isinstance(approval, dict):
            continue
        preview = approval.get("preview") if isinstance(approval.get("preview"), dict) else {}
        action_type = str(approval.get("action_type") or "approval.required")
        title = preview.get("title") or ("Draft Email" if preview.get("kind") == "email_draft" else action_type)
        items.append(
            {
                "id": f"app_{approval.get('id')}",
                "type": "approval",
                "title": title,
                "description": preview.get("body_preview") or preview.get("description") or "Pending approval request",
                "source": "NexusHub",
                "priority": "high",
                "status": "pending",
                "primaryActionLabel": _approval_action_label(action_type),
                "metadata": approval,
            }
        )
    return items


def _approval_action_label(action_type: str) -> str:
    if action_type == "mail.create_draft_reply":
        return "Create Draft"
    if action_type == "calendar.reschedule_event":
        return "Approve Reschedule"
    if action_type == "calendar.schedule_meeting":
        return "Approve Schedule"
    return "Review"


def _is_microsoft_auth_error(message: str, code: str = "") -> bool:
    normalized_code = code.lower()
    normalized_message = message.lower()
    return (
        "authentication_required" in normalized_code
        or "auth" in normalized_code
        or "connect microsoft" in normalized_message
        or "microsoft 365 is not connected" in normalized_message
        or "please connect microsoft" in normalized_message
        or "microsoft 365 authentication is required" in normalized_message
    )


def _priority(value: Any) -> str:
    return str(value) if value in {"high", "medium", "low"} else "medium"


def _date_label(value: Any) -> str | None:
    parsed = _parse_date(value)
    return parsed.date().isoformat() if parsed else None


def _time_label(value: Any) -> str | None:
    parsed = _parse_date(value)
    return parsed.strftime("%H:%M") if parsed else None


def _date_value(value: Any) -> Any:
    if isinstance(value, dict):
        return value.get("dateTime")
    return value


def _parse_date(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        normalized = re.sub(r"(\.\d{6})\d+", r"\1", text)
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None


def _location_label(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("displayName") or "")
    return str(value or "")


def _organizer_label(value: Any) -> str | None:
    if isinstance(value, dict):
        email = value.get("emailAddress") if isinstance(value.get("emailAddress"), dict) else {}
        return email.get("name") or email.get("address")
    return str(value) if value else None


def _raw_calendar_events(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_events = payload.get("value")
    if not isinstance(raw_events, list):
        raw_events = payload.get("meetings") if isinstance(payload.get("meetings"), list) else []
    return [event for event in raw_events if isinstance(event, dict)]


def _event_start_datetime(event: dict[str, Any], *, timezone: str) -> datetime | None:
    start_payload = event.get("start")
    start_value = _date_value(start_payload)
    parsed = _parse_date(start_value)
    if not parsed:
        return None
    tz_name = timezone
    if isinstance(start_payload, dict) and start_payload.get("timeZone"):
        tz_name = str(start_payload.get("timeZone"))
    tz = ZoneInfo(_normalize_timezone(tz_name))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=tz)
    return parsed.astimezone(tz)


def _email_name(value: Any) -> str:
    if isinstance(value, dict):
        email = value.get("emailAddress") if isinstance(value.get("emailAddress"), dict) else {}
        return str(email.get("name") or value.get("name") or "")
    return ""


def _email_address(value: Any) -> str:
    if isinstance(value, dict):
        email = value.get("emailAddress") if isinstance(value.get("emailAddress"), dict) else {}
        return str(email.get("address") or value.get("address") or value.get("email") or "")
    return ""


def _recipient_addresses(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [address for address in (_email_address(item) for item in value) if address]


def _message_body(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("content") or "")
    return str(value or "")


def _normalize_timezone(value: str | None) -> str:
    candidate = TIMEZONE_ALIASES.get(str(value or ""), str(value or DEFAULT_TIMEZONE))
    try:
        ZoneInfo(candidate)
        return candidate
    except ZoneInfoNotFoundError:
        return DEFAULT_TIMEZONE
