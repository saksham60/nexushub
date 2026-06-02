from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.db.supabase_client import get_supabase


class KnowledgeGraphRepository:
    def persist_graph(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        node_id_map: dict[str, str] = {}
        persisted_nodes: list[dict[str, Any]] = []

        for node in nodes:
            persisted = self._upsert_node(
                user_id=user_id, workspace_id=workspace_id, node=node
            )
            node_id_map[node["id"]] = persisted["id"]
            persisted_nodes.append(self._response_node(node, persisted))

        persisted_edges: list[dict[str, Any]] = []
        for edge in edges:
            source_id = node_id_map.get(edge["source"])
            target_id = node_id_map.get(edge["target"])
            if not source_id or not target_id:
                continue
            persisted = self._upsert_edge(
                user_id=user_id,
                workspace_id=workspace_id,
                edge=edge,
                source_node_id=source_id,
                target_node_id=target_id,
            )
            persisted_edges.append(
                self._response_edge(
                    edge=edge,
                    persisted=persisted,
                    source_node_id=source_id,
                    target_node_id=target_id,
                )
            )

        return persisted_nodes, persisted_edges

    def _upsert_node(
        self, *, user_id: str, workspace_id: str | None, node: dict[str, Any]
    ) -> dict[str, Any]:
        supabase = get_supabase()
        now = _now_iso()
        metadata = dict(node.get("metadata") or {})
        metadata["actions"] = node.get("actions") or []
        record = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "external_id": node["id"],
            "type": node["type"],
            "label": node["label"],
            "source": node["source"],
            "title": node.get("title"),
            "subtitle": node.get("subtitle"),
            "priority": node.get("priority"),
            "status": node.get("status"),
            "metadata": metadata,
            "updated_at": now,
        }

        existing = self._node_query(
            user_id=user_id, workspace_id=workspace_id, node=node
        ).execute()
        rows = existing.data or []
        if rows:
            node_id = rows[0]["id"]
            response = (
                supabase.table("knowledge_nodes")
                .update(record)
                .eq("id", node_id)
                .execute()
            )
            updated_rows = response.data or []
            return dict(updated_rows[0] if updated_rows else {**rows[0], **record})

        response = supabase.table("knowledge_nodes").insert(record).execute()
        inserted_rows = response.data or []
        return dict(inserted_rows[0] if inserted_rows else record)

    def _upsert_edge(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        edge: dict[str, Any],
        source_node_id: str,
        target_node_id: str,
    ) -> dict[str, Any]:
        supabase = get_supabase()
        now = _now_iso()
        metadata = dict(edge.get("metadata") or {})
        metadata.update(
            {
                "externalEdgeId": edge["id"],
                "externalSourceId": edge["source"],
                "externalTargetId": edge["target"],
            }
        )
        record = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "source_node_id": source_node_id,
            "target_node_id": target_node_id,
            "type": edge["type"],
            "label": edge.get("label"),
            "weight": edge.get("weight", 1.0),
            "source_system": edge["sourceSystem"],
            "metadata": metadata,
            "updated_at": now,
        }

        existing = self._edge_query(
            user_id=user_id,
            workspace_id=workspace_id,
            edge=edge,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
        ).execute()
        rows = existing.data or []
        if rows:
            edge_id = rows[0]["id"]
            response = (
                supabase.table("knowledge_edges")
                .update(record)
                .eq("id", edge_id)
                .execute()
            )
            updated_rows = response.data or []
            return dict(updated_rows[0] if updated_rows else {**rows[0], **record})

        response = supabase.table("knowledge_edges").insert(record).execute()
        inserted_rows = response.data or []
        return dict(inserted_rows[0] if inserted_rows else record)

    def _node_query(
        self, *, user_id: str, workspace_id: str | None, node: dict[str, Any]
    ) -> Any:
        query = (
            get_supabase()
            .table("knowledge_nodes")
            .select("*")
            .eq("user_id", user_id)
            .eq("external_id", node["id"])
            .eq("source", node["source"])
            .eq("type", node["type"])
        )
        return _workspace_scope(query, workspace_id).limit(1)

    def _edge_query(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        edge: dict[str, Any],
        source_node_id: str,
        target_node_id: str,
    ) -> Any:
        query = (
            get_supabase()
            .table("knowledge_edges")
            .select("*")
            .eq("user_id", user_id)
            .eq("source_node_id", source_node_id)
            .eq("target_node_id", target_node_id)
            .eq("type", edge["type"])
            .eq("source_system", edge["sourceSystem"])
        )
        return _workspace_scope(query, workspace_id).limit(1)

    def _response_node(
        self, raw_node: dict[str, Any], persisted: dict[str, Any]
    ) -> dict[str, Any]:
        metadata = dict(raw_node.get("metadata") or {})
        metadata["externalId"] = raw_node["id"]
        return {
            **raw_node,
            "id": str(persisted.get("id") or raw_node["id"]),
            "metadata": metadata,
        }

    def _response_edge(
        self,
        *,
        edge: dict[str, Any],
        persisted: dict[str, Any],
        source_node_id: str,
        target_node_id: str,
    ) -> dict[str, Any]:
        metadata = dict(edge.get("metadata") or {})
        metadata.update(
            {
                "externalEdgeId": edge["id"],
                "externalSourceId": edge["source"],
                "externalTargetId": edge["target"],
            }
        )
        return {
            **edge,
            "id": str(persisted.get("id") or edge["id"]),
            "source": source_node_id,
            "target": target_node_id,
            "metadata": metadata,
        }


def _workspace_scope(query: Any, workspace_id: str | None) -> Any:
    if workspace_id:
        return query.eq("workspace_id", workspace_id)
    return query.is_("workspace_id", "null")


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()
