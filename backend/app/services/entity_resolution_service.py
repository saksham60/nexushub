from __future__ import annotations

from typing import Any


class EntityResolutionService:
    def resolve_entities(
        self, raw_nodes: list[dict[str, Any]], raw_edges: list[dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        alias_map = self._build_alias_map(raw_nodes)
        resolved_nodes: dict[str, dict[str, Any]] = {}

        for node in raw_nodes:
            canonical_id = alias_map.get(node["id"], node["id"])
            node_copy = {**node, "id": canonical_id}
            if canonical_id not in resolved_nodes:
                resolved_nodes[canonical_id] = node_copy
                continue
            self._merge_node(resolved_nodes[canonical_id], node_copy)

        resolved_edges: dict[str, dict[str, Any]] = {}
        valid_node_ids = set(resolved_nodes)

        for edge in raw_edges:
            source_id = alias_map.get(edge["source"], edge["source"])
            target_id = alias_map.get(edge["target"], edge["target"])
            if source_id not in valid_node_ids or target_id not in valid_node_ids:
                continue
            if source_id == target_id:
                continue

            edge_key = f"{source_id}:{edge['type']}:{target_id}:{edge.get('sourceSystem', 'system')}"
            if edge_key not in resolved_edges:
                edge_copy = edge.copy()
                edge_copy.update({"id": edge_key, "source": source_id, "target": target_id})
                resolved_edges[edge_key] = edge_copy
            else:
                resolved_edges[edge_key]["weight"] += float(edge.get("weight", 1.0))

        return list(resolved_nodes.values()), list(resolved_edges.values())

    def _build_alias_map(self, nodes: list[dict[str, Any]]) -> dict[str, str]:
        user_by_email: dict[str, str] = {}
        person_by_email: dict[str, str] = {}

        for node in nodes:
            email = _node_email(node)
            if not email:
                continue
            if node.get("type") == "user":
                user_by_email[email] = node["id"]
            elif node.get("type") == "person":
                person_by_email.setdefault(email, node["id"])

        aliases: dict[str, str] = {}
        for node in nodes:
            email = _node_email(node)
            if node.get("type") == "person" and email and email in user_by_email:
                aliases[node["id"]] = user_by_email[email]
            elif node.get("type") == "person" and email:
                aliases[node["id"]] = person_by_email[email]

        return aliases

    def _merge_node(self, target: dict[str, Any], incoming: dict[str, Any]) -> None:
        if len(str(incoming.get("label") or "")) > len(str(target.get("label") or "")):
            target["label"] = incoming["label"]
        for field in ("title", "subtitle", "priority", "status"):
            if not target.get(field) and incoming.get(field):
                target[field] = incoming[field]

        target_metadata = dict(target.get("metadata") or {})
        incoming_metadata = dict(incoming.get("metadata") or {})
        source_systems = set(target_metadata.get("sourceSystems") or [])
        source_systems.update(incoming_metadata.get("sourceSystems") or [])
        if incoming.get("source"):
            source_systems.add(incoming["source"])
        if target.get("source"):
            source_systems.add(target["source"])
        target_metadata.update({k: v for k, v in incoming_metadata.items() if v is not None})
        if source_systems:
            target_metadata["sourceSystems"] = sorted(source_systems)
        target["metadata"] = target_metadata

        actions = list(target.get("actions") or [])
        seen_actions = {
            (action.get("label"), action.get("canvasType"), str(action.get("payload")))
            for action in actions
            if isinstance(action, dict)
        }
        for action in incoming.get("actions") or []:
            action_key = (action.get("label"), action.get("canvasType"), str(action.get("payload")))
            if action_key not in seen_actions:
                actions.append(action)
                seen_actions.add(action_key)
        target["actions"] = actions


def _node_email(node: dict[str, Any]) -> str | None:
    metadata = node.get("metadata") or {}
    value = metadata.get("email")
    if not value:
        return None
    email = str(value).strip().lower()
    return email or None
