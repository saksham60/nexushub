from typing import Any

class EntityResolutionService:
    def resolve_entities(self, raw_nodes: list[dict[str, Any]], raw_edges: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        # Deduplicate nodes by ID, keeping the most rich metadata
        resolved_nodes: dict[str, dict[str, Any]] = {}
        for node in raw_nodes:
            node_id = node["id"].lower() if isinstance(node["id"], str) and "@" in node["id"] else node["id"]
            if node_id not in resolved_nodes:
                resolved_nodes[node_id] = node
                resolved_nodes[node_id]["id"] = node_id # Normalize
            else:
                # Merge logic: favor nodes with better labels
                if len(node.get("label", "")) > len(resolved_nodes[node_id].get("label", "")):
                    resolved_nodes[node_id]["label"] = node["label"]
                if "actions" in node and len(node["actions"]) > len(resolved_nodes[node_id].get("actions", [])):
                    resolved_nodes[node_id]["actions"] = node["actions"]

        # Deduplicate edges and adjust targets to resolved IDs
        resolved_edges: dict[str, dict[str, Any]] = {}
        for edge in raw_edges:
            s_id = edge["source"].lower() if isinstance(edge["source"], str) and "@" in edge["source"] else edge["source"]
            t_id = edge["target"].lower() if isinstance(edge["target"], str) and "@" in edge["target"] else edge["target"]
            
            # Simple unique key for edge
            edge_key = f"{s_id}_{edge['type']}_{t_id}"
            
            if edge_key not in resolved_edges:
                edge_copy = edge.copy()
                edge_copy["source"] = s_id
                edge_copy["target"] = t_id
                edge_copy["id"] = edge_key
                resolved_edges[edge_key] = edge_copy
            else:
                resolved_edges[edge_key]["weight"] += edge.get("weight", 1.0)
                
        return list(resolved_nodes.values()), list(resolved_edges.values())
