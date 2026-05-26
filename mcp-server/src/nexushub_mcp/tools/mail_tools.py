from __future__ import annotations

from collections import defaultdict
from typing import Any, Literal

from nexushub_mcp.clients.backend_internal_client import BackendInternalClientError
from nexushub_mcp.mock import mock_mail
from nexushub_mcp.server.context import NexusHubRuntime
from nexushub_mcp.tools.common import ensure_user_id
from nexushub_mcp.utils.logger import get_logger, log_tool_call
from nexushub_mcp.utils.response import approval_required, ok

Priority = Literal["all", "high", "medium", "low"]
Tone = Literal["professional", "concise", "friendly"]

REPLY_TERMS = (
    "please",
    "can you",
    "approve",
    "review",
    "urgent",
    "need your input",
    "waiting for your response",
)

logger = get_logger(__name__)
AUTOMATED_ADDRESS_MARKERS = ("noreply", "donotreply", "mailerdaemon")


def register_mail_tools(mcp: Any, runtime: NexusHubRuntime) -> None:
    @mcp.tool(description="Find emails that likely require the user to reply.")
    async def mail_find_needs_reply(
        user_id: str | None = None,
        workspace_id: str | None = None,
        days: int = 7,
        maxResults: int = 10,
        priority: Priority = "all",
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "mail_find_needs_reply",
            {
                "days": days,
                "maxResults": maxResults,
                "priority": priority,
                "hasUserId": bool(user_id),
            },
        )
        days = _clamp(days, 1, 60)
        max_results = _clamp(maxResults, 1, 50)
        if runtime.settings.mode == "mock":
            return ok(
                "mock",
                mock_mail.find_needs_reply(days=days, max_results=max_results, priority=priority),
            )
        missing = ensure_user_id(runtime.settings.mode, user_id)
        if missing:
            return missing
        try:
            data = await runtime.backend_client.get_recent_mail(
                user_id=user_id or "",
                workspace_id=workspace_id,
                top=max_results * 3,
            )
        except BackendInternalClientError as exc:
            return exc.to_mcp_response()
        messages = list((data.get("data") or data).get("value", []))
        items = [_classify_reply_need(message) for message in messages]
        filtered = [
            item for item in items if item and (priority == "all" or item["urgency"] == priority)
        ]
        filtered = filtered[:max_results]
        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for item in filtered:
            groups[item["urgency"]].append(item)
        return ok(
            "microsoft_graph",
            {
                "windowDays": days,
                "count": len(filtered),
                "groups": [
                    {"urgency": urgency, "count": len(group_items), "items": group_items}
                    for urgency, group_items in groups.items()
                ],
            },
        )

    @mcp.tool(description="Find emails where the user may need to approve or review something.")
    async def mail_find_awaiting_approval(
        user_id: str | None = None,
        workspace_id: str | None = None,
        days: int = 14,
        maxResults: int = 10,
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "mail_find_awaiting_approval",
            {"days": days, "maxResults": maxResults, "hasUserId": bool(user_id)},
        )
        days = _clamp(days, 1, 90)
        max_results = _clamp(maxResults, 1, 50)
        if runtime.settings.mode == "mock":
            return ok("mock", mock_mail.find_awaiting_approval(days=days, max_results=max_results))
        missing = ensure_user_id(runtime.settings.mode, user_id)
        if missing:
            return missing
        try:
            data = await runtime.backend_client.get_recent_mail(
                user_id=user_id or "",
                workspace_id=workspace_id,
                top=max_results * 4,
            )
        except BackendInternalClientError as exc:
            return exc.to_mcp_response()
        items = []
        for message in list((data.get("data") or data).get("value", [])):
            text = f"{message.get('subject', '')} {message.get('bodyPreview', '')}".lower()
            terms = [
                term
                for term in (
                    "approve",
                    "approval",
                    "review",
                    "sign-off",
                    "sign off",
                    "contract",
                    "budget",
                    "invoice",
                )
                if term in text
            ]
            if terms:
                items.append(
                    {
                        "messageId": message.get("id"),
                        "threadId": message.get("conversationId"),
                        "sender": _sender_name(message),
                        "subject": message.get("subject"),
                        "preview": message.get("bodyPreview"),
                        "receivedAt": message.get("receivedDateTime"),
                        "matchedTerms": terms[:4],
                        "reason": f"Contains approval/review language: {', '.join(terms[:3])}",
                    }
                )
        return ok(
            "microsoft_graph",
            {"windowDays": days, "count": len(items[:max_results]), "items": items[:max_results]},
        )

    @mcp.tool(description="Summarize a selected email thread.")
    async def mail_summarize_thread(
        user_id: str | None = None,
        workspace_id: str | None = None,
        threadId: str | None = None,
        messageId: str | None = None,
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "mail_summarize_thread",
            {
                "hasThreadId": bool(threadId),
                "hasMessageId": bool(messageId),
                "hasUserId": bool(user_id),
            },
        )
        if runtime.settings.mode == "mock":
            return ok("mock", mock_mail.summarize_thread(thread_id=threadId, message_id=messageId))
        missing = ensure_user_id(runtime.settings.mode, user_id)
        if missing:
            return missing
        try:
            data = await runtime.backend_client.get_recent_mail(
                user_id=user_id or "", workspace_id=workspace_id, top=20
            )
        except BackendInternalClientError as exc:
            return exc.to_mcp_response()
        messages = list((data.get("data") or data).get("value", []))
        if messageId:
            messages = [
                message for message in messages if message.get("id") == messageId
            ] or messages[:1]
        elif threadId:
            messages = [
                message for message in messages if message.get("conversationId") == threadId
            ] or messages[:5]
        else:
            messages = messages[:5]
        previews = [
            str(message.get("bodyPreview") or "")
            for message in messages
            if message.get("bodyPreview")
        ]
        return ok(
            "microsoft_graph",
            {
                "threadId": threadId or (messages[0].get("conversationId") if messages else None),
                "messageCount": len(messages),
                "summaryBullets": [
                    f"Thread topic: {messages[0].get('subject') if messages else 'Unknown'}.",
                    f"Recent senders: {', '.join(dict.fromkeys(_sender_name(message) for message in messages[:5]))}.",
                    f"Key context: {previews[0][:240] if previews else 'No preview available.'}",
                ],
                "requiredAction": "Review the thread and reply if a decision or input is requested.",
                "suggestedNextSteps": [
                    "Open the newest message before taking action.",
                    "Confirm owner, decision, and deadline.",
                    "Use mail_create_draft_reply to prepare an approval-gated draft.",
                ],
            },
        )

    @mcp.tool(description="Create a draft reply preview. This never sends mail in the MVP.")
    async def mail_create_draft_reply(
        to: str | list[str],
        subject: str,
        context: str,
        user_id: str | None = None,
        workspace_id: str | None = None,
        tone: Tone = "professional",
        intent: str | None = None,
        originalMessageId: str | None = None,
    ) -> dict[str, Any]:
        recipients = _normalize_recipients(to)
        primary_recipient = recipients[0] if recipients else "recipient"
        log_tool_call(
            logger,
            "mail_create_draft_reply",
            {
                "toProvided": bool(recipients),
                "tone": tone,
                "contextLength": len(context),
                "hasUserId": bool(user_id),
                "hasOriginalMessageId": bool(originalMessageId),
            },
        )
        if runtime.settings.mode == "graph":
            missing = ensure_user_id(runtime.settings.mode, user_id)
            if missing:
                return missing
            try:
                draft = await runtime.backend_client.generate_mail_draft_reply(
                    user_id=user_id or "",
                    workspace_id=workspace_id,
                    message_id=originalMessageId,
                    subject=subject,
                    from_email=primary_recipient,
                    to=[],
                    body_preview=context,
                    body=context,
                    mailbox_email="",
                    tone=tone,
                    user_intent=intent,
                )
                draft_data = draft.get("data") or draft
                preview = str(draft_data.get("draftBody") or "")
                payload = {
                    "to": recipients,
                    "subject": draft_data.get("draftSubject")
                    or (subject if subject.lower().startswith("re:") else f"Re: {subject}"),
                    "body": preview,
                    "tone": tone,
                    "intent": intent,
                    "originalMessageId": originalMessageId,
                    "rationale": draft_data.get("rationale"),
                    "confidence": draft_data.get("confidence"),
                }
                created = await runtime.backend_client.create_approval(
                    user_id=user_id or "",
                    workspace_id=workspace_id,
                    tool_name="mail_create_draft_reply",
                    action_type="mail.create_draft_reply",
                    payload=payload,
                    preview={
                        "kind": "email_draft",
                        "title": f"Draft reply to {primary_recipient}",
                        "to": recipients,
                        "subject": payload["subject"],
                        "body": preview,
                        "body_preview": preview,
                        "originalMessageId": originalMessageId,
                    },
                )
            except BackendInternalClientError as exc:
                return exc.to_mcp_response()
            approval_id = str(
                (created.get("data") or created).get("approval_id")
                or (created.get("data") or created).get("id")
            )
            return approval_required(
                "microsoft_graph",
                action_type="mail.create_draft_reply",
                title=f"Draft reply to {primary_recipient}",
                preview=preview,
                payload=payload,
                approval_id=approval_id,
            )

        preview = _draft_reply(
            to=primary_recipient,
            subject=subject,
            context=context,
            tone=tone,
            intent=intent,
        )
        payload = {
            "to": recipients,
            "subject": subject if subject.lower().startswith("re:") else f"Re: {subject}",
            "body": preview,
            "tone": tone,
            "intent": intent,
            "originalMessageId": originalMessageId,
        }
        record = runtime.approval_store.create(
            action_type="mail.create_draft_reply",
            title=f"Draft reply to {primary_recipient}",
            payload=payload,
            preview=preview,
        )
        return approval_required(
            "mock",
            action_type="mail.create_draft_reply",
            title=record.title,
            preview=preview,
            payload=payload,
            approval_id=record.approval_id,
        )

    @mcp.tool(description="Mark selected mail as read. This write action requires approval first.")
    async def mail_mark_as_read(
        messageIds: list[str],
        user_id: str | None = None,
        workspace_id: str | None = None,
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "mail_mark_as_read",
            {"messageCount": len(messageIds), "hasUserId": bool(user_id)},
        )
        payload = {"messageIds": messageIds}
        preview_text = f"Mark {len(messageIds)} selected message(s) as read."
        if runtime.settings.mode == "graph":
            missing = ensure_user_id(runtime.settings.mode, user_id)
            if missing:
                return missing
            try:
                created = await runtime.backend_client.create_approval(
                    user_id=user_id or "",
                    workspace_id=workspace_id,
                    tool_name="mail_mark_as_read",
                    action_type="mail.mark_as_read",
                    payload=payload,
                    preview={"title": preview_text, "messageIds": messageIds},
                )
            except BackendInternalClientError as exc:
                return exc.to_mcp_response()
            approval_id = str(
                (created.get("data") or created).get("approval_id")
                or (created.get("data") or created).get("id")
            )
            return approval_required(
                "microsoft_graph",
                action_type="mail.mark_as_read",
                title=preview_text,
                preview=preview_text,
                payload=payload,
                approval_id=approval_id,
            )

        record = runtime.approval_store.create(
            action_type="mail.mark_as_read",
            title=preview_text,
            payload=payload,
            preview=preview_text,
        )
        return approval_required(
            "mock",
            action_type="mail.mark_as_read",
            title=record.title,
            preview=record.preview or "",
            payload=payload,
            approval_id=record.approval_id,
        )


def _classify_reply_need(message: dict[str, Any]) -> dict[str, Any] | None:
    sender_email = _sender_email(message)
    reply_to = _reply_to_emails(message)
    reply_recipient = reply_to[0] if reply_to else sender_email
    if not reply_recipient or _is_automated_email(reply_recipient):
        return None
    text = f"{message.get('subject', '')} {message.get('bodyPreview', '')}".lower()
    score = 0
    reasons: list[str] = []
    if not message.get("isRead", True):
        score += 2
        reasons.append("unread")
    matched = [term for term in REPLY_TERMS if term in text]
    if matched:
        score += min(3, len(matched))
        reasons.append(f"matched language: {', '.join(matched[:3])}")
    if "?" in text:
        score += 1
        reasons.append("contains a question")
    if message.get("importance") == "high":
        score += 2
        reasons.append("marked high importance")
    if score < 2:
        return None
    urgency = "high" if score >= 5 else "medium" if score >= 3 else "low"
    return {
        "messageId": message.get("id"),
        "threadId": message.get("conversationId"),
        "sender": _sender_name(message),
        "senderEmail": reply_recipient,
        "senderAddress": sender_email,
        "replyTo": reply_to,
        "subject": message.get("subject"),
        "preview": message.get("bodyPreview"),
        "body": _body_content(message),
        "to": _recipient_emails(message),
        "webLink": message.get("webLink"),
        "receivedAt": message.get("receivedDateTime"),
        "reason": ", ".join(reasons),
        "urgency": urgency,
    }


def _sender_name(message: dict[str, Any]) -> str:
    from_block = message.get("from") or {}
    email = from_block.get("emailAddress") or {}
    return str(email.get("name") or email.get("address") or "Unknown sender")


def _sender_email(message: dict[str, Any]) -> str | None:
    from_block = message.get("from") or {}
    email = from_block.get("emailAddress") or {}
    address = email.get("address")
    return str(address) if address else None


def _is_automated_email(address: str | None) -> bool:
    if not address or "@" not in address:
        return False
    local_part = address.split("@", 1)[0].lower()
    domain = address.split("@", 1)[1].lower()
    compact_local = "".join(char for char in local_part if char.isalnum())
    suffix = local_part.removeprefix("outlook_")
    return any(marker in compact_local for marker in AUTOMATED_ADDRESS_MARKERS) or (
        domain == "outlook.com"
        and local_part.startswith("outlook_")
        and len(suffix) >= 8
        and all(char in "0123456789abcdef" for char in suffix)
    )


def _reply_to_emails(message: dict[str, Any]) -> list[str]:
    reply_to = message.get("replyTo")
    if not isinstance(reply_to, list):
        return []
    values: list[str] = []
    for recipient in reply_to:
        if not isinstance(recipient, dict):
            continue
        email = recipient.get("emailAddress")
        if isinstance(email, dict) and email.get("address"):
            address = str(email["address"])
            if not _is_automated_email(address):
                values.append(address)
    return values


def _recipient_emails(message: dict[str, Any]) -> list[str]:
    recipients = message.get("toRecipients")
    if not isinstance(recipients, list):
        return []
    values: list[str] = []
    for recipient in recipients:
        if not isinstance(recipient, dict):
            continue
        email = recipient.get("emailAddress")
        if isinstance(email, dict) and email.get("address"):
            values.append(str(email["address"]))
    return values


def _body_content(message: dict[str, Any]) -> str | None:
    body = message.get("body")
    if isinstance(body, dict) and body.get("content"):
        return str(body["content"])
    return None


def _draft_reply(*, to: str, subject: str, context: str, tone: Tone, intent: str | None) -> str:
    greeting = f"Hi {to.split('@')[0].split('.')[0].title()}," if "@" in to else f"Hi {to},"
    intent_line = intent or "sharing my response based on the current context"
    if tone == "concise":
        return f"{greeting}\n\nI reviewed this and am {intent_line}. Key context: {context[:280]}\n\nPlease confirm if you need anything else.\n\nBest,"
    if tone == "friendly":
        return f"{greeting}\n\nThanks for the note. I reviewed the details and am {intent_line}. The main point I am working from is: {context[:320]}\n\nHappy to adjust if there is new context.\n\nBest,"
    return f"{greeting}\n\nI reviewed the thread regarding {subject}. Based on the available context, I am {intent_line}.\n\nContext considered: {context[:420]}\n\nPlease let me know if you would like me to revise this before next steps are taken.\n\nBest,"


def _clamp(value: int, lower: int, upper: int) -> int:
    return max(lower, min(value, upper))


def _normalize_recipients(value: str | list[str]) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    return [item for item in value if isinstance(item, str) and item.strip()]
