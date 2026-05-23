from __future__ import annotations

from datetime import UTC, datetime
from threading import RLock
from typing import Any, Protocol
from uuid import uuid4

from nexushub_mcp.approvals.approval_types import ApprovalRecord


class ApprovalStore(Protocol):
    def create(
        self,
        *,
        action_type: str,
        title: str,
        payload: dict[str, Any],
        preview: str | None = None,
    ) -> ApprovalRecord: ...

    def list_pending(self, *, max_results: int = 10) -> list[ApprovalRecord]: ...

    def get(self, approval_id: str) -> ApprovalRecord | None: ...

    def execute(
        self, *, approval_id: str, approved: bool, simulated: bool
    ) -> ApprovalRecord | None: ...


class InMemoryApprovalStore:
    def __init__(self) -> None:
        self._records: dict[str, ApprovalRecord] = {}
        self._lock = RLock()

    def create(
        self,
        *,
        action_type: str,
        title: str,
        payload: dict[str, Any],
        preview: str | None = None,
    ) -> ApprovalRecord:
        record = ApprovalRecord(
            approval_id=f"appr_{uuid4().hex[:16]}",
            action_type=action_type,
            title=title,
            payload=payload,
            preview=preview,
        )
        with self._lock:
            self._records[record.approval_id] = record
        return record

    def list_pending(self, *, max_results: int = 10) -> list[ApprovalRecord]:
        with self._lock:
            records = [record for record in self._records.values() if record.status == "pending"]
        return sorted(records, key=lambda item: item.created_at, reverse=True)[:max_results]

    def get(self, approval_id: str) -> ApprovalRecord | None:
        with self._lock:
            return self._records.get(approval_id)

    def execute(
        self, *, approval_id: str, approved: bool, simulated: bool
    ) -> ApprovalRecord | None:
        with self._lock:
            record = self._records.get(approval_id)
            if record is None:
                return None
            if record.status != "pending":
                return record
            record.status = "executed" if approved else "rejected"
            record.executed_at = datetime.now(UTC)
            record.result = {
                "executed": approved,
                "simulated": simulated,
                "message": (
                    "Action execution simulated. No email was sent, no Teams message was posted, "
                    "and no user data was deleted."
                    if approved
                    else "Action rejected by user."
                ),
            }
            return record
