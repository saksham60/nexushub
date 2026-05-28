from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Any
from app.models.knowledge_graph import KnowledgeGraphResponse
from app.services.knowledge_graph_service import KnowledgeGraphService
from app.services.microsoft_graph_service import MicrosoftGraphService
from app.config import get_settings

router = APIRouter(prefix="/api/knowledge-graph", tags=["Knowledge Graph"])

def get_kg_service():
    # In a real DI setup, inject proper instances
    settings = get_settings()
    ms_graph_service = MicrosoftGraphService(settings)
    return KnowledgeGraphService(ms_graph_service)

@router.get("", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph(
    user_id: str = Query(..., description="User ID"),
    workspace_id: str = Query(..., description="Workspace ID"),
    limit: int = Query(50, description="Limit per entity type"),
    timeRange: str = Query("7d", description="Time range (e.g., 7d, 30d)"),
    types: str = Query("people,email,meeting,document", description="Comma separated entity types"),
    source: str = Query("outlook,calendar,teams,onedrive", description="Comma separated sources"),
    kg_service: KnowledgeGraphService = Depends(get_kg_service)
) -> KnowledgeGraphResponse:
    # Filter by timeRange and types is implicitly handled by limit for MVP
    response = await kg_service.build_knowledge_graph(user_id=user_id, workspace_id=workspace_id, limit=limit)
    return response

@router.get("/entities/{entity_id}")
async def get_entity_details(
    entity_id: str,
    user_id: str = Query(..., description="User ID"),
    workspace_id: str = Query(..., description="Workspace ID"),
    kg_service: KnowledgeGraphService = Depends(get_kg_service)
) -> dict[str, Any]:
    try:
        return await kg_service.get_entity_details(entity_id=entity_id, user_id=user_id, workspace_id=workspace_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/search")
async def search_knowledge_graph(
    q: str = Query(..., description="Search query"),
    user_id: str = Query(..., description="User ID"),
    workspace_id: str = Query(..., description="Workspace ID"),
    kg_service: KnowledgeGraphService = Depends(get_kg_service)
) -> dict[str, Any]:
    # Basic search across local resolved graph
    graph = await kg_service.build_knowledge_graph(user_id, workspace_id, limit=50)
    matched_nodes = [n for n in graph.nodes if q.lower() in n.label.lower() or (n.title and q.lower() in n.title.lower())]
    return {
        "nodes": [n.model_dump() for n in matched_nodes]
    }

@router.post("/refresh")
async def refresh_knowledge_graph(
    user_id: str = Query(..., description="User ID"),
    workspace_id: str = Query(..., description="Workspace ID"),
    kg_service: KnowledgeGraphService = Depends(get_kg_service)
) -> KnowledgeGraphResponse:
    # For MVP, building the graph builds it fresh. In production, this would trigger an async sync to DB.
    response = await kg_service.build_knowledge_graph(user_id=user_id, workspace_id=workspace_id, limit=100)
    return response
