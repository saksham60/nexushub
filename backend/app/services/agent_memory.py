from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4


PENDING_INTENT_TTL_MINUTES = 30


@dataclass(slots=True)
class PendingAgentIntent:
    intent_id: str
    user_id: str
    workspace_id: str | None
    original_message: str
    tool_name: str | None
    arguments: dict[str, Any] = field(default_factory=dict)
    clarification_question: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_context(self, follow_up: str) -> dict[str, Any]:
        return {
            "pendingIntentId": self.intent_id,
            "originalMessage": self.original_message,
            "followUpMessage": follow_up,
            "previousToolName": self.tool_name,
            "partialArguments": self.arguments,
            "clarificationQuestion": self.clarification_question,
        }


class AgentConversationMemory:
    _pending_by_conversation: dict[str, PendingAgentIntent] = {}

    def ensure_conversation_id(self, conversation_id: str | None) -> str:
        normalized = (conversation_id or "").strip()
        return normalized or str(uuid4())

    def get_pending(
        self, *, conversation_id: str, user_id: str, workspace_id: str | None
    ) -> PendingAgentIntent | None:
        self._clear_expired()
        pending = self._pending_by_conversation.get(conversation_id)
        if not pending:
            return None
        if pending.user_id != user_id or pending.workspace_id != workspace_id:
            return None
        return pending

    def save_pending(
        self,
        *,
        conversation_id: str,
        user_id: str,
        workspace_id: str | None,
        original_message: str,
        tool_name: str | None,
        arguments: dict[str, Any] | None,
        clarification_question: str | None,
    ) -> PendingAgentIntent:
        previous = self._pending_by_conversation.get(conversation_id)
        intent_id = previous.intent_id if previous else str(uuid4())
        pending = PendingAgentIntent(
            intent_id=intent_id,
            user_id=user_id,
            workspace_id=workspace_id,
            original_message=previous.original_message if previous else original_message,
            tool_name=tool_name,
            arguments=dict(arguments or {}),
            clarification_question=clarification_question,
            created_at=previous.created_at if previous else datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self._pending_by_conversation[conversation_id] = pending
        return pending

    def clear_pending(self, *, conversation_id: str) -> None:
        self._pending_by_conversation.pop(conversation_id, None)

    def _clear_expired(self) -> None:
        cutoff = datetime.now(UTC) - timedelta(minutes=PENDING_INTENT_TTL_MINUTES)
        expired = [
            conversation_id
            for conversation_id, pending in self._pending_by_conversation.items()
            if pending.updated_at < cutoff
        ]
        for conversation_id in expired:
            self._pending_by_conversation.pop(conversation_id, None)
