from __future__ import annotations

from typing import Any

import httpx

from nexushub_mcp.config import Settings


class BackendInternalClientError(Exception):
    def __init__(
        self, *, status_code: int, code: str, message: str, payload: dict[str, Any] | None = None
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.payload = payload or {}

    def to_mcp_response(self) -> dict[str, Any]:
        if self.code == "authentication_required":
            return {
                "ok": False,
                "source": "microsoft_graph",
                "status": "authentication_required",
                "provider": "microsoft",
                "connect_url": "/auth/microsoft/start",
                "message": "Please connect Microsoft 365 first.",
            }
        return {
            "ok": False,
            "source": "microsoft_graph",
            "error": {
                "code": self.code,
                "message": self.message,
                "suggestion": "Retry later or contact the NexusHub backend administrator.",
            },
        }


class BackendInternalClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def get_me(self, *, user_id: str, workspace_id: str | None = None) -> dict[str, Any]:
        return await self._post(
            "/internal/graph/me",
            {"user_id": user_id, "workspace_id": workspace_id},
        )

    async def get_recent_mail(
        self, *, user_id: str, workspace_id: str | None = None, top: int = 10
    ) -> dict[str, Any]:
        return await self._post(
            "/internal/graph/mail/recent",
            {"user_id": user_id, "workspace_id": workspace_id, "top": top},
        )

    async def get_today_calendar(
        self, *, user_id: str, workspace_id: str | None = None
    ) -> dict[str, Any]:
        return await self._post(
            "/internal/graph/calendar/today",
            {"user_id": user_id, "workspace_id": workspace_id},
        )

    async def get_recent_files(
        self, *, user_id: str, workspace_id: str | None = None, top: int = 10
    ) -> dict[str, Any]:
        return await self._post(
            "/internal/graph/files/recent",
            {"user_id": user_id, "workspace_id": workspace_id, "top": top},
        )

    async def create_approval(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        tool_name: str,
        action_type: str,
        payload: dict[str, Any],
        preview: dict[str, Any],
    ) -> dict[str, Any]:
        return await self._post(
            "/internal/approvals/create",
            {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "tool_name": tool_name,
                "action_type": action_type,
                "payload": payload,
                "preview": preview,
            },
        )

    async def generate_mail_draft_reply(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        message_id: str | None,
        subject: str,
        from_email: str,
        to: list[str],
        body_preview: str,
        body: str,
        mailbox_email: str,
        tone: str,
        user_intent: str | None,
    ) -> dict[str, Any]:
        return await self._post(
            "/internal/mail/draft-reply",
            {
                "user_id": user_id,
                "workspace_id": workspace_id,
                "messageId": message_id or "",
                "subject": subject,
                "from": from_email,
                "to": to,
                "bodyPreview": body_preview,
                "body": body,
                "mailboxEmail": mailbox_email,
                "tone": tone,
                "userIntent": user_intent or "draft a concise executive reply",
            },
        )

    async def execute_approval(
        self, *, user_id: str, approval_id: str, approved: bool
    ) -> dict[str, Any]:
        return await self._post(
            "/internal/approvals/execute",
            {"user_id": user_id, "approval_id": approval_id, "approved": approved},
        )

    async def list_approvals(
        self, *, user_id: str, workspace_id: str | None = None, max_results: int = 10
    ) -> dict[str, Any]:
        return await self._post(
            "/internal/approvals/list",
            {"user_id": user_id, "workspace_id": workspace_id, "max_results": max_results},
        )

    async def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        if not self._settings.internal_service_token:
            raise BackendInternalClientError(
                status_code=500,
                code="internal_service_token_missing",
                message="MCP INTERNAL_SERVICE_TOKEN is not configured.",
            )

        headers = {
            "Authorization": f"Bearer {self._settings.internal_service_token}",
            "Content-Type": "application/json",
        }
        url = f"{self._settings.backend_internal_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(url, json=body, headers=headers)
        except httpx.HTTPError as exc:
            raise BackendInternalClientError(
                status_code=502,
                code="backend_unreachable",
                message="NexusHub backend internal API is unreachable.",
            ) from exc

        payload: dict[str, Any] = {}
        if response.content:
            parsed = response.json()
            payload = parsed if isinstance(parsed, dict) else {"value": parsed}

        if response.status_code >= 400:
            raw_error = payload.get("error")
            raw_detail = payload.get("detail")
            error_payload: dict[str, Any] = raw_error if isinstance(raw_error, dict) else {}
            detail_payload: dict[str, Any] = raw_detail if isinstance(raw_detail, dict) else {}
            code = str(
                payload.get("code")
                or error_payload.get("code")
                or detail_payload.get("code")
                or "backend_internal_error"
            )
            message = str(
                payload.get("message")
                or error_payload.get("message")
                or detail_payload.get("message")
                or "Backend internal request failed."
            )
            raise BackendInternalClientError(
                status_code=response.status_code,
                code=code,
                message=message,
                payload=payload,
            )
        return payload
