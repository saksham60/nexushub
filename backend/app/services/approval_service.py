from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.errors import ForbiddenError, NotFoundError
from app.db.supabase_client import get_supabase


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

    def execute_approval(
        self, *, user_id: str, approval_id: str, approved: bool
    ) -> dict[str, Any]:
        approval = self._get_for_user(user_id=user_id, approval_id=approval_id)
        if approval.get("status") != "pending":
            return approval
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
