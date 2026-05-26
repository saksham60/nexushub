from __future__ import annotations

from typing import Any
from langsmith import traceable

from nexushub_mcp.clients.backend_internal_client import BackendInternalClientError
from nexushub_mcp.server.context import NexusHubRuntime
from nexushub_mcp.tools.common import authentication_required, ensure_user_id
from nexushub_mcp.utils.logger import get_logger, log_tool_call
from nexushub_mcp.utils.response import ok

logger = get_logger(__name__)


def register_auth_tools(mcp: Any, runtime: NexusHubRuntime) -> None:
    @mcp.tool(description="Check whether Microsoft Graph authentication is connected.")
    @traceable(run_type="tool")
    async def auth_get_status(
        user_id: str | None = None,
        workspace_id: str | None = None,
    ) -> dict[str, Any]:
        log_tool_call(
            logger, "auth_get_status", {"mode": runtime.settings.mode, "hasUserId": bool(user_id)}
        )
        if runtime.settings.mode == "mock":
            return ok(
                "mock",
                {
                    "authenticated": True,
                    "mode": "mock",
                    "provider": "microsoft",
                    "display_name": "Mock User",
                    "email": "mock.user@example.com",
                },
            )
        missing = ensure_user_id(runtime.settings.mode, user_id)
        if missing:
            return missing
        try:
            data = await runtime.backend_client.get_me(
                user_id=user_id or "", workspace_id=workspace_id
            )
        except BackendInternalClientError as exc:
            if exc.code == "authentication_required":
                return authentication_required()
            return exc.to_mcp_response()
        profile = data.get("data") or data
        return ok(
            "microsoft_graph",
            {
                "authenticated": True,
                "mode": "graph",
                "provider": "microsoft",
                "display_name": profile.get("displayName"),
                "email": profile.get("mail") or profile.get("userPrincipalName"),
            },
        )

    @mcp.tool(description="Get the Microsoft connect URL owned by the NexusHub backend.")
    @traceable(run_type="tool")
    async def auth_get_login_url() -> dict[str, Any]:
        log_tool_call(logger, "auth_get_login_url", {"mode": runtime.settings.mode})
        return ok(runtime.settings.source, {"connect_url": "/auth/microsoft/start"})
