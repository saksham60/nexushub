from __future__ import annotations

from typing import Any
from uuid import uuid4

from langsmith import traceable

from app.core.errors import (
    AuthenticationRequiredError,
    ConfigurationError,
    ConsentRequiredError,
    GraphServiceError,
    NexusHubError,
)
from app.core.logging import get_logger
from app.services.agent_capabilities import build_direct_response
from app.services.agent_memory import AgentConversationMemory, PendingAgentIntent
from app.services.calendar_reschedule_service import CalendarRescheduleService
from app.services.mcp_client import call_tool
from app.services.semantic_agent_router import SemanticAgentRouter, SemanticRoutingDecision
from app.services.knowledge_graph_service import KnowledgeGraphService
from app.services.microsoft_graph_service import MicrosoftGraphService

logger = get_logger(__name__)


class AgentOrchestrator:
    @traceable(run_type="chain")
    async def chat(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        message: str,
        conversation_id: str | None = None,
        selected_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        memory = AgentConversationMemory()
        active_conversation_id = memory.ensure_conversation_id(conversation_id)
        pending = memory.get_pending(
            conversation_id=active_conversation_id,
            user_id=user_id,
            workspace_id=workspace_id,
        )

        routing_message = message
        routing_context = dict(selected_context or {})
        if pending:
            routing_context["pendingIntent"] = pending.to_context(message)
            routing_message = _follow_up_message(message=message, pending=pending)

        # Search Knowledge Graph for Context
        try:
            ms_graph = MicrosoftGraphService()
            kg_service = KnowledgeGraphService(ms_graph)
            graph = await kg_service.build_knowledge_graph(user_id=user_id, workspace_id=workspace_id, limit=50)
            
            # Simple keyword matching for MVP
            query_lower = message.lower()
            matched_nodes = [n for n in graph.nodes if n.label.lower() in query_lower or (n.title and n.title.lower() in query_lower)]
            
            if matched_nodes:
                routing_context["knowledgeContext"] = {
                    "matchedEntities": [n.model_dump() for n in matched_nodes],
                    "relatedEntities": [], # simplified for MVP
                    "relationshipSummary": f"Found {len(matched_nodes)} related workspace entities."
                }
                # Inject a brief summary into the message for the LLM
                labels = ", ".join([n.label for n in matched_nodes[:5]])
                routing_message = f"{message}\n[Workspace Context: Found related entities: {labels}]"
        except Exception as e:
            logger.warning(f"Failed to fetch knowledge graph context: {e}")

        response, decision = await self._chat_once(
            user_id=user_id,
            workspace_id=workspace_id,
            message=routing_message,
            selected_context=routing_context,
        )
        
        # Attach knowledgeContext to final response if found
        if "knowledgeContext" in routing_context:
            response["knowledgeContext"] = routing_context["knowledgeContext"]

        if response.get("type") == "clarification":
            saved = memory.save_pending(
                conversation_id=active_conversation_id,
                user_id=user_id,
                workspace_id=workspace_id,
                original_message=pending.original_message if pending else message,
                tool_name=(decision.tool_name if decision else response.get("toolUsed")),
                arguments=(decision.arguments if decision else None)
                or (pending.arguments if pending else {}),
                clarification_question=str(response.get("message") or ""),
            )
            response["pendingIntentId"] = saved.intent_id
        else:
            memory.clear_pending(conversation_id=active_conversation_id)

        response["conversationId"] = active_conversation_id
        response["runId"] = str(uuid4())
        canvas = _execution_canvas_for_response(response)
        if canvas:
            response["executionCanvas"] = canvas
        return response

    async def _chat_once(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        message: str,
        selected_context: dict[str, Any] | None,
    ) -> tuple[dict[str, Any], SemanticRoutingDecision | None]:
        decision = await SemanticAgentRouter().route(
            user_id=user_id,
            workspace_id=workspace_id,
            message=message,
            selected_context=selected_context,
        )
        if decision.response_type == "direct_response":
            direct_data = await build_direct_response(message)
            return (
                {
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
                    "routing": _routing_debug(
                        selected_tool="direct_response",
                        decision=decision,
                        clarification_needed=False,
                        approval_required=False,
                    ),
                },
                decision,
            )
        if decision.response_type == "clarification":
            return (
                {
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
                    "routing": _routing_debug(
                        selected_tool=decision.tool_name,
                        decision=decision,
                        clarification_needed=True,
                        approval_required=decision.requires_approval,
                    ),
                },
                decision,
            )
        if decision.response_type == "error":
            return (
                {
                    "type": "error",
                    "error": {
                        "code": decision.error_code or "ROUTER_ERROR",
                        "message": decision.error_message
                        or "NexusHub could not route the command.",
                    },
                    "agent": {
                        "mode": "semantic",
                        "routing_source": "openai_semantic_router",
                        "reason": decision.reason,
                    },
                    "routing": _routing_debug(
                        selected_tool=decision.tool_name,
                        decision=decision,
                        clarification_needed=False,
                        approval_required=decision.requires_approval,
                    ),
                },
                decision,
            )

        tool_name = decision.tool_name
        if not tool_name:
            return (
                {
                    "type": "clarification",
                    "message": "I could not match that request to an available NexusHub tool.",
                    "confidence": decision.confidence,
                    "routing": _routing_debug(
                        selected_tool=None,
                        decision=decision,
                        clarification_needed=True,
                        approval_required=False,
                    ),
                },
                decision,
            )
        if decision.requires_approval and tool_name != "approval_execute":
            if tool_name == "calendar_reschedule_event":
                return (
                    await self._prepare_calendar_reschedule(
                        user_id=user_id,
                        workspace_id=workspace_id,
                        message=message,
                        decision=decision,
                    ),
                    decision,
                )
            return (
                await self._prepare_mcp_approval(
                    user_id=user_id,
                    workspace_id=workspace_id,
                    decision=decision,
                ),
                decision,
            )

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
            return (
                {
                    "type": "connect_required",
                    "provider": "microsoft",
                    "connect_url": "/auth/microsoft/start",
                    "message": "Please connect Microsoft 365 first.",
                    "routing": _routing_debug(
                        selected_tool=tool_name,
                        decision=decision,
                        clarification_needed=False,
                        approval_required=False,
                    ),
                },
                decision,
            )
        return (
            {
                "type": "agent_response",
                "tool_used": tool_name,
                "data": tool_result,
                "agent": {
                    "mode": "semantic",
                    "routing_source": "openai_semantic_router",
                    "reason": decision.reason,
                    "confidence": decision.confidence,
                },
                "routing": _routing_debug(
                    selected_tool=tool_name,
                    decision=decision,
                    clarification_needed=False,
                    approval_required=False,
                ),
            },
            decision,
        )

    async def _prepare_mcp_approval(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        decision: SemanticRoutingDecision,
    ) -> dict[str, Any]:
        tool_name = decision.tool_name
        if not tool_name:
            return {
                "type": "clarification",
                "message": "I could not match that request to an available NexusHub tool.",
                "confidence": decision.confidence,
                "routing": _routing_debug(
                    selected_tool=None,
                    decision=decision,
                    clarification_needed=True,
                    approval_required=False,
                ),
            }

        try:
            result = await call_tool(
                tool_name,
                {
                    "user_id": user_id,
                    "workspace_id": workspace_id,
                    **(decision.arguments or {}),
                },
            )
        except GraphServiceError as exc:
            return _agent_error(
                decision=decision,
                code="MCP_UNAVAILABLE",
                message=exc.message,
            )

        tool_result = result.get("result") if isinstance(result, dict) else result
        if not isinstance(tool_result, dict):
            return _agent_error(
                decision=decision,
                code="INVALID_TOOL_RESPONSE",
                message="NexusHub received an invalid MCP approval response.",
            )
        if tool_result.get("ok") is False:
            error = tool_result.get("error") if isinstance(tool_result.get("error"), dict) else {}
            code = str(error.get("code") or "TOOL_ERROR")
            message = str(error.get("message") or "The approval tool failed.")
            if code == "authentication_required":
                return {
                    "type": "connect_required",
                    "provider": "microsoft",
                    "connect_url": "/auth/microsoft/start",
                    "message": message,
                    "routing": _routing_debug(
                        selected_tool=tool_name,
                        decision=decision,
                        clarification_needed=False,
                        approval_required=True,
                    ),
                }
            return _agent_error(decision=decision, code=code, message=message)

        data = tool_result.get("data") if isinstance(tool_result.get("data"), dict) else tool_result
        if data.get("clarification"):
            return {
                "type": "clarification",
                "message": str(data.get("clarification")),
                "toolUsed": tool_name,
                "confidence": decision.confidence,
                "routing": _routing_debug(
                    selected_tool=tool_name,
                    decision=decision,
                    clarification_needed=True,
                    approval_required=True,
                ),
            }
        if data.get("status") == "approval_required":
            return {
                "type": "approval_required",
                "message": str(data.get("title") or "Review this action before NexusHub executes it."),
                "toolUsed": tool_name,
                "confidence": decision.confidence,
                "requiresApproval": True,
                "approvalId": data.get("approvalId"),
                "data": data,
                "agent": {
                    "mode": "semantic",
                    "routing_source": "openai_semantic_router",
                    "reason": decision.reason,
                },
                "routing": _routing_debug(
                    selected_tool=tool_name,
                    decision=decision,
                    clarification_needed=False,
                    approval_required=True,
                ),
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
            "routing": _routing_debug(
                selected_tool=tool_name,
                decision=decision,
                clarification_needed=False,
                approval_required=True,
            ),
        }

    async def _prepare_calendar_reschedule(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        message: str,
        decision: SemanticRoutingDecision,
    ) -> dict[str, Any]:
        try:
            prepared = await CalendarRescheduleService().prepare_approval(
                user_id=user_id,
                workspace_id=workspace_id,
                arguments=decision.arguments or {},
                message=message,
            )
        except AuthenticationRequiredError:
            return {
                "type": "connect_required",
                "provider": "microsoft",
                "connect_url": "/auth/microsoft/start",
                "message": "Please connect Microsoft 365 first.",
                "routing": _routing_debug(
                    selected_tool=decision.tool_name,
                    decision=decision,
                    clarification_needed=False,
                    approval_required=True,
                ),
            }
        except ConfigurationError as exc:
            return {
                "type": "clarification",
                "message": exc.message,
                "toolUsed": decision.tool_name,
                "confidence": decision.confidence,
                "routing": _routing_debug(
                    selected_tool=decision.tool_name,
                    decision=decision,
                    clarification_needed=True,
                    approval_required=True,
                ),
            }
        except ConsentRequiredError as exc:
            return _agent_error(
                decision=decision,
                code="GRAPH_PERMISSION_MISSING",
                message=exc.message,
            )
        except GraphServiceError as exc:
            return _agent_error(
                decision=decision,
                code="GRAPH_ERROR",
                message=exc.message,
            )
        except NexusHubError as exc:
            return _agent_error(
                decision=decision,
                code=exc.code,
                message=exc.message,
            )

        approval = prepared.get("approval") if isinstance(prepared.get("approval"), dict) else None
        return {
            "type": "approval_required",
            "message": prepared.get("message")
            or "Review this meeting reschedule before NexusHub updates Outlook.",
            "toolUsed": decision.tool_name,
            "confidence": decision.confidence,
            "requiresApproval": True,
            "approvalId": prepared.get("approvalId"),
            "approval": approval,
            "data": {"arguments": decision.arguments or {}},
            "agent": {
                "mode": "semantic",
                "routing_source": "openai_semantic_router",
                "reason": decision.reason,
            },
            "routing": _routing_debug(
                selected_tool=decision.tool_name,
                decision=decision,
                clarification_needed=False,
                approval_required=True,
            ),
        }


def _follow_up_message(*, message: str, pending: PendingAgentIntent) -> str:
    return (
        "Continue the pending NexusHub task using the user's follow-up answer.\n"
        f"Original request: {pending.original_message}\n"
        f"Previous tool: {pending.tool_name or 'unknown'}\n"
        f"Partial arguments: {pending.arguments}\n"
        f"Clarification question: {pending.clarification_question or ''}\n"
        f"User follow-up answer: {message}"
    )


def _execution_canvas_for_response(response: dict[str, Any]) -> dict[str, Any] | None:
    tool_name = str(response.get("toolUsed") or response.get("tool_used") or "")
    data = dict(response.get("data") if isinstance(response.get("data"), dict) else {})
    if response.get("approvalId") and not data.get("approvalId"):
        data["approvalId"] = response.get("approvalId")
    if isinstance(response.get("approval"), dict) and not data.get("approval"):
        data["approval"] = response.get("approval")
    title = str(response.get("message") or data.get("title") or "Review action")

    if tool_name.startswith("mail_"):
        return {"type": "compose_email", "title": title, "payload": data}
    if tool_name.startswith("calendar_"):
        return {"type": "schedule_meeting", "title": title, "payload": data}
    if tool_name.startswith("docs_"):
        return {"type": "document_intelligence", "title": title, "payload": data}
    if tool_name.startswith("approval_") or response.get("approvalId"):
        return {"type": "approval_review", "title": title, "payload": data}
    return None


def _routing_debug(
    *,
    selected_tool: str | None,
    decision: SemanticRoutingDecision,
    clarification_needed: bool,
    approval_required: bool,
) -> dict[str, Any]:
    return {
        "selectedTool": selected_tool,
        "confidence": decision.confidence,
        "reason": decision.reason,
        "clarificationNeeded": clarification_needed,
        "approvalRequired": approval_required,
    }


def _agent_error(*, decision: SemanticRoutingDecision, code: str, message: str) -> dict[str, Any]:
    return {
        "type": "error",
        "error": {"code": code, "message": message},
        "routing": _routing_debug(
            selected_tool=decision.tool_name,
            decision=decision,
            clarification_needed=False,
            approval_required=True,
        ),
    }
