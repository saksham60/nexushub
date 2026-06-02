from datetime import datetime
from typing import Any
from app.models.knowledge_graph import (
    KnowledgeGraphResponse,
    KnowledgeNode,
    KnowledgeEdge,
    GraphStats,
    NodeAction,
)

class GraphBuilderService:
    def build_graph_response(
        self,
        nodes_data: list[dict[str, Any]],
        edges_data: list[dict[str, Any]],
        *,
        source_status: dict[str, dict[str, Any]] | None = None,
        filters: dict[str, Any] | None = None,
        degraded: bool = False,
        message: str | None = None,
        stale: bool = False,
    ) -> KnowledgeGraphResponse:
        nodes = []
        for n in nodes_data:
            actions = [NodeAction(**a) for a in n.get("actions", [])]
            nodes.append(KnowledgeNode(
                id=n["id"],
                type=n["type"],
                label=n["label"],
                title=n.get("title"),
                subtitle=n.get("subtitle"),
                source=n["source"],
                priority=n.get("priority"),
                status=n.get("status"),
                metadata=n.get("metadata", {}),
                actions=actions
            ))

        node_ids = {node.id for node in nodes}
        edges = []
        seen_edges: set[str] = set()
        for e in edges_data:
            if e["source"] not in node_ids or e["target"] not in node_ids:
                continue
            edge_key = f"{e['source']}:{e['type']}:{e['target']}:{e['sourceSystem']}"
            if edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)
            edges.append(KnowledgeEdge(
                id=e["id"],
                source=e["source"],
                target=e["target"],
                type=e["type"],
                label=e.get("label"),
                weight=e.get("weight", 1.0),
                sourceSystem=e["sourceSystem"],
                metadata=e.get("metadata", {})
            ))

        people_count = sum(1 for n in nodes if n.type in ["person", "user"])
        email_count = sum(1 for n in nodes if n.type == "email")
        meeting_count = sum(1 for n in nodes if n.type == "meeting")
        document_count = sum(1 for n in nodes if n.type == "document")
        approval_count = sum(1 for n in nodes if n.type == "approval")
        automation_count = sum(1 for n in nodes if n.type == "automation")
        topic_count = sum(1 for n in nodes if n.type == "topic")

        stats = GraphStats(
            totalNodes=len(nodes),
            totalEdges=len(edges),
            peopleCount=people_count,
            emailCount=email_count,
            meetingCount=meeting_count,
            documentCount=document_count,
            approvalCount=approval_count,
            automationCount=automation_count,
            topicCount=topic_count
        )

        return KnowledgeGraphResponse(
            nodes=nodes,
            links=edges,
            stats=stats,
            generatedAt=datetime.utcnow().isoformat() + "Z",
            degraded=degraded,
            message=message,
            sourceStatus=source_status or {},
            filters=filters or {},
            stale=stale,
        )
