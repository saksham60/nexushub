from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.services.agent_capabilities import (
    build_direct_response,
)
from app.services.mcp_client import call_tool
from app.services.semantic_agent_router import SemanticAgentRouter

logger = get_logger(__name__)


class AgentOrchestrator:
    async def chat(
        self, *, user_id: str, workspace_id: str | None, message: str
    ) -> dict[str, Any]:
        decision = await SemanticAgentRouter().route(
            user_id=user_id, workspace_id=workspace_id, message=message
        )
        if decision.response_type == "direct_response":
            direct_data = await build_direct_response(message)
            return {
                "type": "agent_response",
                "tool_used": "direct_response",
                "data": {
                    "ok": True,
                    "source": "agent",
                    "data": direct_data,
                },
                "agent": {
                    "mode": "semantic",
                    "routing_source": "direct_catalog_response",
                    "reason": decision.reason,
                    "confidence": decision.confidence,
                },
            }
        if decision.response_type == "clarification":
            return {
                "type": "clarification",
                "message": decision.clarification_question
                or "Please clarify what you want NexusHub to do.",
                "toolUsed": decision.tool_name,
                "confidence": decision.confidence,
                "agent": {
                    "mode": "semantic",
                    "routing_source": "openai_semantic_router",
                    "reason": decision.reason,
                },
            }
        if decision.response_type == "error":
            return {
                "type": "error",
                "error": {
                    "code": decision.error_code or "ROUTER_ERROR",
                    "message": decision.error_message or "NexusHub could not route the command.",
                },
                "agent": {
                    "mode": "semantic",
                    "routing_source": "openai_semantic_router",
                    "reason": decision.reason,
                },
            }

        tool_name = decision.tool_name
        if not tool_name:
            return {
                "type": "clarification",
                "message": "I could not match that request to an available NexusHub tool.",
                "confidence": decision.confidence,
            }
        if decision.requires_approval:
            return {
                "type": "approval_required",
                "message": "This action requires explicit approval before NexusHub can execute it.",
                "toolUsed": tool_name,
                "confidence": decision.confidence,
                "requiresApproval": True,
                "approvalId": None,
                "data": {"arguments": decision.arguments or {}},
                "agent": {
                    "mode": "semantic",
                    "routing_source": "openai_semantic_router",
                    "reason": decision.reason,
                },
            }

        arguments = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            **(decision.arguments or {}),
        }
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
            "agent": {
                "mode": "semantic",
                "routing_source": "openai_semantic_router",
                "reason": decision.reason,
                "confidence": decision.confidence,
            },
        }
