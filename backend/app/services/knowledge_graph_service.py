from typing import Any
from datetime import datetime
from langsmith import traceable
from app.models.knowledge_graph import KnowledgeGraphResponse, KnowledgeNode
from app.services.microsoft_graph_service import MicrosoftGraphService
from app.services.entity_extraction_service import EntityExtractionService
from app.services.entity_resolution_service import EntityResolutionService
from app.services.graph_builder_service import GraphBuilderService

class KnowledgeGraphService:
    def __init__(self, ms_graph_service: MicrosoftGraphService):
        self.ms_graph_service = ms_graph_service
        self.extraction_service = EntityExtractionService()
        self.resolution_service = EntityResolutionService()
        self.builder_service = GraphBuilderService()

    @traceable(run_type="chain", name="build_knowledge_graph")
    async def build_knowledge_graph(self, user_id: str, workspace_id: str, limit: int = 50) -> KnowledgeGraphResponse:
        try:
            # 1. Fetch raw data from Graph API (or mock depending on service state)
            emails = await self.ms_graph_service.get_recent_mail(user_id=user_id, workspace_id=workspace_id, top=limit)
            meetings = await self.ms_graph_service.get_agenda(user_id=user_id, workspace_id=workspace_id, top=limit)
            documents = await self.ms_graph_service.get_recent_files(user_id=user_id, workspace_id=workspace_id, top=limit)

            email_list = emails.get("value", []) if isinstance(emails, dict) else []
            meeting_list = meetings.get("value", []) if isinstance(meetings, dict) else []
            doc_list = documents.get("value", []) if isinstance(documents, dict) else []

            # 2. Extract Entities
            e_nodes, e_edges = self.extraction_service.extract_from_emails(email_list)
            m_nodes, m_edges = self.extraction_service.extract_from_meetings(meeting_list)
            d_nodes, d_edges = self.extraction_service.extract_from_documents(doc_list)

            raw_nodes = e_nodes["nodes"] + m_nodes["nodes"] + d_nodes["nodes"]
            raw_edges = e_edges["edges"] + m_edges["edges"] + d_edges["edges"]

            # Add current user as central node
            raw_nodes.append({
                "id": "me",
                "type": "user",
                "label": "You",
                "source": "nexushub",
                "metadata": {"email": user_id},
                "actions": []
            })
            
            # Tie loose nodes to 'me' if needed or leave them disjoint.
            # Realistically, they are all connected to 'me' indirectly.
            for n in raw_nodes:
                if n["type"] in ["email", "meeting", "document"] and n["id"] != "me":
                    raw_edges.append({
                        "id": f"me_related_{n['id']}",
                        "source": "me",
                        "target": n["id"],
                        "type": "related_to",
                        "sourceSystem": "nexushub",
                        "weight": 0.1
                    })

            # 3. Resolve Entities
            res_nodes, res_edges = self.resolution_service.resolve_entities(raw_nodes, raw_edges)

            # 4. Build Graph Response
            response = self.builder_service.build_graph_response(res_nodes, res_edges)
            return response
            
        except Exception as e:
            # Return degraded state
            stats = GraphBuilderService().build_graph_response([], []).stats
            return KnowledgeGraphResponse(
                nodes=[],
                links=[],
                stats=stats,
                generatedAt=datetime.utcnow().isoformat() + "Z",
                degraded=True,
                message=str(e)
            )

    @traceable(run_type="chain", name="get_entity_details")
    async def get_entity_details(self, entity_id: str, user_id: str, workspace_id: str) -> dict[str, Any]:
        # For MVP, we rebuild the graph and filter. In production, query the DB.
        graph = await self.build_knowledge_graph(user_id, workspace_id, limit=50)
        
        target_node = next((n for n in graph.nodes if n.id == entity_id), None)
        if not target_node:
            raise ValueError("Entity not found")
            
        # Find related nodes
        related_ids = set()
        for edge in graph.links:
            if edge.source == entity_id:
                related_ids.add(edge.target)
            elif edge.target == entity_id:
                related_ids.add(edge.source)
                
        related_nodes = [n for n in graph.nodes if n.id in related_ids]
        
        return {
            "entity": target_node.model_dump(),
            "relatedEntities": [n.model_dump() for n in related_nodes],
            "timeline": [],
            "suggestedActions": [a.model_dump() for a in target_node.actions]
        }
