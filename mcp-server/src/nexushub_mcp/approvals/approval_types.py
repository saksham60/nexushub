from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

ApprovalStatus = Literal["pending", "executed", "rejected"]


@dataclass(slots=True)
class ApprovalRecord:
    approval_id: str
    action_type: str
    title: str
    payload: dict[str, Any]
    status: ApprovalStatus = "pending"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    preview: str | None = None
    executed_at: datetime | None = None
    result: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "approvalId": self.approval_id,
            "actionType": self.action_type,
            "title": self.title,
            "payload": self.payload,
            "status": self.status,
            "createdAt": self.created_at.isoformat(),
            "preview": self.preview,
            "executedAt": self.executed_at.isoformat() if self.executed_at else None,
            "result": self.result,
        }
