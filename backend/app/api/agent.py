from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.errors import NexusHubError
from app.models.schemas import AgentChatRequest
from app.services.agent_orchestrator import AgentOrchestrator

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/chat")
async def chat(payload: AgentChatRequest) -> dict[str, object]:
    try:
        return await AgentOrchestrator().chat(**payload.model_dump())
    except NexusHubError as exc:
        raise HTTPException(
            status_code=400, detail={"code": exc.code, "message": exc.message}
        ) from exc
