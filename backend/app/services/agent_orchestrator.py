from __future__ import annotations

from typing import Any

from app.services.mcp_client import call_tool


class AgentOrchestrator:
    async def chat(
        self, *, user_id: str, workspace_id: str | None, message: str
    ) -> dict[str, Any]:
        tool_name = self._route(message)
        arguments = {"user_id": user_id, "workspace_id": workspace_id}
        result = await call_tool(tool_name, arguments)
        tool_result = result.get("result") or result
        if (
            isinstance(tool_result, dict)
            and tool_result.get("status") == "authentication_required"
        ):
            return {
                "type": "connect_required",
                "provider": "microsoft",
                "connect_url": "/auth/microsoft/start",
                "message": "Please connect Microsoft 365 first.",
            }
        return {"type": "agent_response", "tool_used": tool_name, "data": tool_result}

    def _route(self, message: str) -> str:
        lowered = message.lower()
        if "approval" in lowered:
            return "approval_list_pending"
        if "agenda" in lowered or "calendar" in lowered or "today" in lowered:
            return "calendar_get_today_agenda"
        if "file" in lowered or "document" in lowered or "onedrive" in lowered:
            return "docs_list_recent_files"
        if "email" in lowered or "mail" in lowered or "reply" in lowered:
            return "mail_find_needs_reply"
        return "mail_find_needs_reply"
