from __future__ import annotations

from typing import Any

from app.config import get_settings
from app.core.logging import get_logger
from app.services.agent_capabilities import (
    DEFAULT_CAPABILITY_MESSAGE,
    build_direct_response,
    is_capability_question,
)
from app.services.mcp_client import call_tool

logger = get_logger(__name__)

DIRECT_RESPONSE_MESSAGE = DEFAULT_CAPABILITY_MESSAGE


class AgentOrchestrator:
    async def chat(
        self, *, user_id: str, workspace_id: str | None, message: str
    ) -> dict[str, Any]:
        settings = get_settings()
        if settings.agent_mode == "langgraph":
            try:
                from app.services.langgraph_agent import LangGraphAgent

                return await LangGraphAgent().chat(
                    user_id=user_id, workspace_id=workspace_id, message=message
                )
            except Exception as exc:
                logger.warning(
                    "LangGraph agent failed; using rule-based fallback.",
                    extra={
                        "metadata": {
                            "errorType": type(exc).__name__,
                            "messageLength": len(message),
                        }
                    },
                )
        return await self._rule_based_chat(
            user_id=user_id, workspace_id=workspace_id, message=message
        )

    async def _rule_based_chat(
        self, *, user_id: str, workspace_id: str | None, message: str
    ) -> dict[str, Any]:
        tool_name = self._route(message)
        if tool_name == "direct_response":
            direct_data = await build_direct_response(message)
            return {
                "type": "agent_response",
                "tool_used": "direct_response",
                "data": {
                    "ok": True,
                    "source": "agent",
                    "data": direct_data,
                },
                "agent": {"mode": "rule_based"},
            }
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
        return {
            "type": "agent_response",
            "tool_used": tool_name,
            "data": tool_result,
            "agent": {"mode": "rule_based"},
        }

    def _route(self, message: str) -> str:
        lowered = message.lower()
        if self._is_greeting_or_smalltalk(lowered) or is_capability_question(lowered):
            return "direct_response"
        if "approval" in lowered:
            return "approval_list_pending"
        if "agenda" in lowered or "calendar" in lowered or "today" in lowered:
            return "calendar_get_today_agenda"
        if "file" in lowered or "document" in lowered or "onedrive" in lowered:
            return "docs_list_recent_files"
        if "email" in lowered or "mail" in lowered or "reply" in lowered:
            return "mail_find_needs_reply"
        return "mail_find_needs_reply"

    def _is_greeting_or_smalltalk(self, message: str) -> bool:
        normalized = message.strip().lower().strip(".!?")
        return normalized in {
            "hi",
            "hello",
            "hey",
            "hii",
            "yo",
            "thanks",
            "thank you",
            "what can you do",
            "help",
        }
