from __future__ import annotations

from typing import Any

from nexushub_mcp.clients.backend_internal_client import BackendInternalClientError
from nexushub_mcp.server.context import NexusHubRuntime
from nexushub_mcp.tools.common import ensure_user_id
from nexushub_mcp.utils.logger import get_logger, log_tool_call
from nexushub_mcp.utils.response import error, ok

logger = get_logger(__name__)


def register_approval_tools(mcp: Any, runtime: NexusHubRuntime) -> None:
    @mcp.tool(description="List pending approval-required actions created by NexusHub tools.")
    async def approval_list_pending(
        user_id: str | None = None,
        workspace_id: str | None = None,
        maxResults: int = 10,
    ) -> dict[str, Any]:
        log_tool_call(
            logger, "approval_list_pending", {"maxResults": maxResults, "hasUserId": bool(user_id)}
        )
        max_results = max(1, min(maxResults, 50))
        if runtime.settings.mode == "graph":
            missing = ensure_user_id(runtime.settings.mode, user_id)
            if missing:
                return missing
            try:
                data = await runtime.backend_client.list_approvals(
                    user_id=user_id or "", workspace_id=workspace_id, max_results=max_results
                )
            except BackendInternalClientError as exc:
                return exc.to_mcp_response()
            return ok("microsoft_graph", data.get("data") or data)
        records = runtime.approval_store.list_pending(max_results=max_results)
        return ok(
            "mock", {"count": len(records), "items": [record.to_dict() for record in records]}
        )

    @mcp.tool(description="Execute a previously approved action by approvalId.")
    async def approval_execute(
        approvalId: str,
        approved: bool,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "approval_execute",
            {
                "approvalIdProvided": bool(approvalId),
                "approved": approved,
                "hasUserId": bool(user_id),
            },
        )
        if runtime.settings.mode == "graph":
            missing = ensure_user_id(runtime.settings.mode, user_id)
            if missing:
                return missing
            try:
                data = await runtime.backend_client.execute_approval(
                    user_id=user_id or "", approval_id=approvalId, approved=approved
                )
            except BackendInternalClientError as exc:
                return exc.to_mcp_response()
            return ok("microsoft_graph", data.get("data") or data)
        record = runtime.approval_store.execute(
            approval_id=approvalId, approved=approved, simulated=True
        )
        if record is None:
            return error(
                "approval_not_found",
                "No pending approval record matched the provided approvalId.",
                "Call approval_list_pending and pass one of the returned approvalId values.",
                source="mock",
            )
        return ok("mock", record.to_dict())
