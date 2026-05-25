from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.errors import (
    AuthenticationRequiredError,
    ConfigurationError,
    ConsentRequiredError,
    ForbiddenError,
    NotFoundError,
)
from app.db.supabase_client import get_supabase
from app.services.microsoft_connection_service import MicrosoftConnectionService
from app.services.microsoft_graph_service import MicrosoftGraphService


class ApprovalService:
    def create_approval(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        tool_name: str,
        action_type: str,
        payload: dict[str, Any],
        preview: dict[str, Any],
    ) -> dict[str, Any]:
        record = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "tool_name": tool_name,
            "action_type": action_type,
            "payload": payload,
            "preview": preview,
            "status": "pending",
        }
        response = get_supabase().table("approval_actions").insert(record).execute()
        created = dict(response.data[0])
        self._audit(
            user_id=user_id,
            workspace_id=workspace_id,
            event_type="approval.created",
            metadata={"approval_id": created["id"], "action_type": action_type},
        )
        return {"approval_id": created["id"], **created}

    def list_pending(
        self, *, user_id: str, workspace_id: str | None = None, max_results: int = 10
    ) -> dict[str, Any]:
        query = (
            get_supabase()
            .table("approval_actions")
            .select("*")
            .eq("user_id", user_id)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .limit(max_results)
        )
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        response = query.execute()
        return {"count": len(response.data or []), "items": response.data or []}

    async def execute_approval(
        self,
        *,
        user_id: str,
        approval_id: str,
        approved: bool,
        draft_override: dict[str, Any] | None = None,
        simulate: bool = False,
    ) -> dict[str, Any]:
        approval = self._get_for_user(user_id=user_id, approval_id=approval_id)
        if approval.get("status") != "pending":
            return approval
        if approved and approval.get("action_type") == "mail.create_draft_reply":
            return await self._execute_mail_draft_approval(
                user_id=user_id,
                approval=approval,
                draft_override=draft_override,
                simulate=simulate,
            )
        if approved and approval.get("action_type") == "calendar.reschedule_event":
            return await self._execute_calendar_reschedule_approval(
                user_id=user_id,
                approval=approval,
                simulate=simulate,
            )
        now = datetime.now(UTC).isoformat()
        status = "approved" if approved else "rejected"
        update = {
            "status": status,
            "approved_at": now if approved else None,
            "rejected_at": now if not approved else None,
            "executed_at": now if approved else None,
        }
        response = (
            get_supabase()
            .table("approval_actions")
            .update(update)
            .eq("id", approval_id)
            .eq("user_id", user_id)
            .execute()
        )
        updated = dict(response.data[0])
        self._audit(
            user_id=user_id,
            workspace_id=updated.get("workspace_id"),
            event_type="approval.executed" if approved else "approval.rejected",
            metadata={"approval_id": approval_id, "simulated": True},
        )
        return {**updated, "executed": approved, "simulated": True}

    async def create_mail_draft_from_approval(
        self,
        *,
        user_id: str,
        approval_id: str,
        draft_body: str,
        subject: str,
        recipients: list[str],
        original_message_id: str | None,
        workspace_id: str | None = None,
        simulate: bool = False,
    ) -> dict[str, Any]:
        return await self.execute_approval(
            user_id=user_id,
            approval_id=approval_id,
            approved=True,
            draft_override={
                "body": draft_body,
                "subject": subject,
                "to": recipients,
                "originalMessageId": original_message_id,
                "workspace_id": workspace_id,
            },
            simulate=simulate,
        )

    async def create_mail_draft_direct(
        self,
        *,
        user_id: str,
        draft_body: str,
        subject: str,
        recipients: list[str],
        original_message_id: str | None,
        workspace_id: str | None = None,
        simulate: bool = False,
    ) -> dict[str, Any]:
        if not draft_body.strip():
            raise ConfigurationError("Draft body is required.")
        normalized_recipients = _normalize_recipients(recipients)
        if not normalized_recipients:
            raise ConfigurationError(
                "At least one recipient is required to create an Outlook draft."
            )

        draft_result = await self._create_outlook_draft(
            user_id=user_id,
            workspace_id=workspace_id,
            original_message_id=original_message_id,
            subject=subject,
            recipients=normalized_recipients,
            body=draft_body,
            simulate=simulate,
        )
        self._audit(
            user_id=user_id,
            workspace_id=workspace_id,
            event_type="mail.draft_created",
            metadata={
                "outlookDraftId": draft_result.get("outlookDraftId"),
                "mailboxEmail": draft_result.get("mailboxEmail"),
                "simulated": simulate,
                "approval_id": None,
            },
        )
        return {"draft": draft_result}

    async def send_mail_draft(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        outlook_draft_id: str,
        simulate: bool = False,
    ) -> dict[str, Any]:
        connection = MicrosoftConnectionService().get_connected_account(
            user_id=user_id, workspace_id=workspace_id
        )
        if not connection:
            raise AuthenticationRequiredError("Microsoft 365 is not connected.")
        mailbox_email = str(connection.get("provider_email") or "")
        sent_at = datetime.now(UTC).isoformat()

        if simulate:
            self._audit(
                user_id=user_id,
                workspace_id=workspace_id,
                event_type="mail.sent",
                metadata={
                    "outlookDraftId": outlook_draft_id,
                    "mailboxEmail": mailbox_email,
                    "simulated": True,
                },
            )
            return {
                "success": True,
                "outlookDraftId": outlook_draft_id,
                "mailboxEmail": mailbox_email,
                "sentAt": sent_at,
                "simulated": True,
            }

        if not MicrosoftConnectionService().has_scope(
            user_id=user_id, workspace_id=workspace_id, scope="Mail.Send"
        ):
            raise ConsentRequiredError(
                "Mail.Send permission is missing. Reconnect Microsoft 365 and consent to Mail.Send."
            )

        await MicrosoftGraphService().send_draft(
            user_id=user_id,
            workspace_id=workspace_id,
            draft_id=outlook_draft_id,
        )
        self._audit(
            user_id=user_id,
            workspace_id=workspace_id,
            event_type="mail.sent",
            metadata={
                "outlookDraftId": outlook_draft_id,
                "mailboxEmail": mailbox_email,
                "simulated": False,
            },
        )
        return {
            "success": True,
            "outlookDraftId": outlook_draft_id,
            "mailboxEmail": mailbox_email,
            "sentAt": sent_at,
            "simulated": False,
        }

    async def _execute_mail_draft_approval(
        self,
        *,
        user_id: str,
        approval: dict[str, Any],
        draft_override: dict[str, Any] | None,
        simulate: bool,
    ) -> dict[str, Any]:
        payload = dict(approval.get("payload") or {})
        if draft_override:
            payload.update(
                {key: value for key, value in draft_override.items() if value is not None}
            )

        workspace_id = payload.get("workspace_id") or approval.get("workspace_id")
        recipients = _normalize_recipients(payload.get("to") or payload.get("recipients"))
        subject = str(payload.get("subject") or "Re:")
        body = str(payload.get("body") or "")
        original_message_id = payload.get("originalMessageId") or payload.get(
            "original_message_id"
        )
        if not body.strip():
            raise ConfigurationError("Draft body is required.")
        if not recipients:
            raise ConfigurationError(
                "At least one recipient is required to create an Outlook draft."
            )

        draft_result = await self._create_outlook_draft(
            user_id=user_id,
            workspace_id=workspace_id,
            original_message_id=str(original_message_id) if original_message_id else None,
            subject=subject,
            recipients=recipients,
            body=body,
            simulate=simulate,
        )

        now = datetime.now(UTC).isoformat()
        response = (
            get_supabase()
            .table("approval_actions")
            .update(
                {
                    "status": "approved",
                    "approved_at": now,
                    "executed_at": now,
                }
            )
            .eq("id", approval["id"])
            .eq("user_id", user_id)
            .execute()
        )
        updated = dict(response.data[0])
        self._audit(
            user_id=user_id,
            workspace_id=updated.get("workspace_id"),
            event_type="mail.draft_created",
            metadata={
                "approval_id": approval["id"],
                "outlookDraftId": draft_result.get("outlookDraftId"),
                "mailboxEmail": draft_result.get("mailboxEmail"),
                "simulated": simulate,
            },
        )
        return {
            **updated,
            "executed": True,
            "simulated": simulate,
            "draft": draft_result,
        }

    async def _execute_calendar_reschedule_approval(
        self,
        *,
        user_id: str,
        approval: dict[str, Any],
        simulate: bool,
    ) -> dict[str, Any]:
        payload = dict(approval.get("payload") or {})
        workspace_id = payload.get("workspace_id") or approval.get("workspace_id")
        event_id = str(payload.get("eventId") or "")
        subject = str(payload.get("subject") or "Meeting")
        timezone = str(payload.get("timezone") or "UTC")
        new_start = _parse_datetime(payload.get("newStart"), "New meeting start is required.")
        new_end = _parse_datetime(payload.get("newEnd"), "New meeting end is required.")
        if not event_id:
            raise ConfigurationError("Calendar event id is required.")

        connection = MicrosoftConnectionService().get_connected_account(
            user_id=user_id, workspace_id=workspace_id
        )
        if not connection:
            raise AuthenticationRequiredError("Microsoft 365 is not connected.")
        mailbox_email = str(connection.get("provider_email") or "")

        if simulate:
            calendar_result = {
                "success": True,
                "eventId": event_id,
                "subject": subject,
                "start": new_start.isoformat(),
                "end": new_end.isoformat(),
                "timezone": timezone,
                "mailboxEmail": mailbox_email,
                "webLink": None,
                "updatedAt": datetime.now(UTC).isoformat(),
                "simulated": True,
            }
        else:
            if not MicrosoftConnectionService().has_scope(
                user_id=user_id, workspace_id=workspace_id, scope="Calendars.ReadWrite"
            ):
                raise ConsentRequiredError(
                    "Calendars.ReadWrite permission is missing. Reconnect Microsoft 365 and consent to Calendars.ReadWrite."
                )
            updated_event = await MicrosoftGraphService().update_event_time(
                user_id=user_id,
                workspace_id=workspace_id,
                event_id=event_id,
                start=new_start,
                end=new_end,
                timezone=timezone,
            )
            calendar_result = {
                "success": True,
                "eventId": event_id,
                "subject": updated_event.get("subject") or subject,
                "start": updated_event.get("start") or new_start.isoformat(),
                "end": updated_event.get("end") or new_end.isoformat(),
                "timezone": timezone,
                "mailboxEmail": mailbox_email,
                "webLink": updated_event.get("webLink"),
                "updatedAt": datetime.now(UTC).isoformat(),
                "simulated": False,
            }

        now = datetime.now(UTC).isoformat()
        response = (
            get_supabase()
            .table("approval_actions")
            .update(
                {
                    "status": "approved",
                    "approved_at": now,
                    "executed_at": now,
                }
            )
            .eq("id", approval["id"])
            .eq("user_id", user_id)
            .execute()
        )
        updated = dict(response.data[0])
        self._audit(
            user_id=user_id,
            workspace_id=updated.get("workspace_id"),
            event_type="calendar.rescheduled",
            metadata={
                "approval_id": approval["id"],
                "eventId": event_id,
                "mailboxEmail": mailbox_email,
                "simulated": simulate,
            },
        )
        return {
            **updated,
            "executed": True,
            "simulated": simulate,
            "calendarEvent": calendar_result,
        }

    async def _create_outlook_draft(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        original_message_id: str | None,
        subject: str,
        recipients: list[str],
        body: str,
        simulate: bool,
    ) -> dict[str, Any]:
        connection = MicrosoftConnectionService().get_connected_account(
            user_id=user_id, workspace_id=workspace_id
        )
        if not connection:
            raise AuthenticationRequiredError("Microsoft 365 is not connected.")
        mailbox_email = str(connection.get("provider_email") or "")

        if simulate:
            created_at = datetime.now(UTC).isoformat()
            return {
                "success": True,
                "outlookDraftId": f"demo_draft_{approval_safe_timestamp(created_at)}",
                "mailboxEmail": mailbox_email,
                "createdAt": created_at,
                "webLink": None,
                "simulated": True,
            }

        if not MicrosoftConnectionService().has_scope(
            user_id=user_id, workspace_id=workspace_id, scope="Mail.ReadWrite"
        ):
            raise ConsentRequiredError(
                "Mail.ReadWrite permission is missing. Reconnect Microsoft 365 and consent to Mail.ReadWrite."
            )

        draft = await MicrosoftGraphService().create_draft_reply(
            user_id=user_id,
            workspace_id=workspace_id,
            original_message_id=original_message_id,
            subject=subject,
            recipients=recipients,
            body=body,
        )
        created_at = draft.get("createdDateTime") or datetime.now(UTC).isoformat()
        return {
            "success": True,
            "outlookDraftId": draft.get("id"),
            "mailboxEmail": mailbox_email,
            "createdAt": created_at,
            "webLink": draft.get("webLink"),
            "simulated": False,
        }

    def _get_for_user(self, *, user_id: str, approval_id: str) -> dict[str, Any]:
        response = (
            get_supabase()
            .table("approval_actions")
            .select("*")
            .eq("id", approval_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            raise NotFoundError("Approval was not found.")
        approval = dict(rows[0])
        if approval.get("user_id") != user_id:
            raise ForbiddenError("Approval does not belong to user.")
        return approval

    def _audit(
        self,
        *,
        user_id: str | None,
        workspace_id: str | None,
        event_type: str,
        metadata: dict[str, Any],
    ) -> None:
        get_supabase().table("audit_logs").insert(
            {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "event_type": event_type,
                "metadata": metadata,
            }
        ).execute()


def _normalize_recipients(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return []


def approval_safe_timestamp(value: str) -> str:
    return "".join(char for char in value if char.isdigit())[:14] or "created"


def _parse_datetime(value: Any, error_message: str) -> datetime:
    if not value:
        raise ConfigurationError(error_message)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError as exc:
        raise ConfigurationError(error_message) from exc
