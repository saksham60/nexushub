from __future__ import annotations

from typing import Any

from langsmith import traceable

from app.models.knowledge_graph import KnowledgeGraphResponse
from app.services.entity_extraction_service import (
    EntityExtractionService,
    GraphFragment,
)
from app.services.entity_resolution_service import EntityResolutionService
from app.services.graph_builder_service import GraphBuilderService
from app.services.knowledge_graph_repository import KnowledgeGraphRepository
from app.services.microsoft_graph_service import MicrosoftGraphService


CORE_SOURCES = ("outlook", "calendar", "onedrive")
DEFAULT_TYPES = ("user", "person", "email", "meeting", "document")


class KnowledgeGraphService:
    def __init__(
        self,
        ms_graph_service: MicrosoftGraphService | None = None,
        repository: KnowledgeGraphRepository | None = None,
    ) -> None:
        self.ms_graph_service = ms_graph_service or MicrosoftGraphService()
        self.repository = repository or KnowledgeGraphRepository()
        self.extraction_service = EntityExtractionService()
        self.resolution_service = EntityResolutionService()
        self.builder_service = GraphBuilderService()

    @traceable(run_type="chain", name="build_knowledge_graph")
    async def build_knowledge_graph(
        self,
        user_id: str,
        workspace_id: str | None = None,
        limit: int = 50,
        *,
        time_range: str = "7d",
        types: list[str] | tuple[str, ...] | None = None,
        sources: list[str] | tuple[str, ...] | None = None,
    ) -> KnowledgeGraphResponse:
        workspace_id = normalize_workspace_id(workspace_id)
        limit = min(max(limit, 1), 50)
        selected_sources = _normalize_sources(sources)
        selected_types = _normalize_types(types)
        filters = {
            "limit": limit,
            "timeRange": time_range,
            "types": list(selected_types),
            "sources": list(selected_sources),
        }

        source_status = _initial_source_status(selected_sources)
        fragment = GraphFragment()
        profile = await self._safe_get_profile(user_id, workspace_id)
        user_node = _current_user_node(profile=profile, user_id=user_id)
        current_user_email = user_node["metadata"].get("email")
        fragment.nodes.append(user_node)

        successful_sources = 0

        if "outlook" in selected_sources:
            try:
                payload = await self.ms_graph_service.get_recent_messages(
                    user_id=user_id, workspace_id=workspace_id, top=limit
                )
                messages = _payload_list(payload)
                fragment.extend(
                    self.extraction_service.extract_from_emails(
                        messages,
                        user_node_id=user_node["id"],
                        current_user_email=current_user_email,
                    )
                )
                source_status["outlook"] = _source_ok("outlook", len(messages))
                successful_sources += 1
            except Exception as exc:
                source_status["outlook"] = _source_error("outlook", exc)

        if "calendar" in selected_sources:
            try:
                payload = await self.ms_graph_service.get_calendar_range(
                    user_id=user_id,
                    workspace_id=workspace_id,
                    days=_parse_time_range_days(time_range),
                    top=limit,
                )
                meetings = _payload_list(payload)
                fragment.extend(
                    self.extraction_service.extract_from_meetings(
                        meetings,
                        user_node_id=user_node["id"],
                        current_user_email=current_user_email,
                    )
                )
                source_status["calendar"] = _source_ok("calendar", len(meetings))
                successful_sources += 1
            except Exception as exc:
                source_status["calendar"] = _source_error("calendar", exc)

        if "onedrive" in selected_sources:
            try:
                payload = await self.ms_graph_service.get_recent_files(
                    user_id=user_id, workspace_id=workspace_id, top=limit
                )
                documents = _payload_list(payload)
                fragment.extend(
                    self.extraction_service.extract_from_documents(
                        documents,
                        user_node_id=user_node["id"],
                        current_user_email=current_user_email,
                    )
                )
                source_status["onedrive"] = _source_ok("onedrive", len(documents))
                successful_sources += 1
            except Exception as exc:
                source_status["onedrive"] = _source_error("onedrive", exc)

        if successful_sources == 0:
            return self.builder_service.build_graph_response(
                [],
                [],
                source_status=source_status,
                filters=filters,
                degraded=True,
                message=_status_message(source_status) or "No graph sources were available.",
            )

        resolved_nodes, resolved_edges = self.resolution_service.resolve_entities(
            fragment.nodes, fragment.edges
        )
        filtered_nodes, filtered_edges = _filter_by_types(
            resolved_nodes, resolved_edges, selected_types
        )

        stale = False
        messages: list[str] = []
        if any(status["status"] == "error" for status in source_status.values()):
            messages.append("Some knowledge graph sources failed.")

        try:
            filtered_nodes, filtered_edges = self.repository.persist_graph(
                user_id=user_id,
                workspace_id=workspace_id,
                nodes=filtered_nodes,
                edges=filtered_edges,
            )
        except Exception as exc:
            stale = True
            messages.append(f"Graph persistence is unavailable: {exc}")

        return self.builder_service.build_graph_response(
            filtered_nodes,
            filtered_edges,
            source_status=source_status,
            filters=filters,
            degraded=bool(messages and not stale)
            or any(status["status"] == "error" for status in source_status.values()),
            message=" ".join(messages) or None,
            stale=stale,
        )

    @traceable(run_type="chain", name="get_entity_details")
    async def get_entity_details(
        self, entity_id: str, user_id: str, workspace_id: str | None = None
    ) -> dict[str, Any]:
        graph = await self.build_knowledge_graph(
            user_id=user_id, workspace_id=workspace_id, limit=50
        )

        target_node = next((n for n in graph.nodes if n.id == entity_id), None)
        if not target_node:
            raise ValueError("Entity not found")

        related_ids = set()
        timeline: list[dict[str, Any]] = []
        for edge in graph.links:
            if edge.source == entity_id:
                related_ids.add(edge.target)
                timeline.append(edge.model_dump())
            elif edge.target == entity_id:
                related_ids.add(edge.source)
                timeline.append(edge.model_dump())

        related_nodes = [n for n in graph.nodes if n.id in related_ids]

        return {
            "entity": target_node.model_dump(),
            "relatedEntities": [n.model_dump() for n in related_nodes],
            "timeline": timeline,
            "suggestedActions": [a.model_dump() for a in target_node.actions],
        }

    async def _safe_get_profile(
        self, user_id: str, workspace_id: str | None
    ) -> dict[str, Any]:
        try:
            return await self.ms_graph_service.get_me(user_id, workspace_id)
        except Exception:
            return {}


def normalize_workspace_id(workspace_id: str | None) -> str | None:
    if workspace_id is None:
        return None
    normalized = str(workspace_id).strip()
    if not normalized or normalized.lower() == "default":
        return None
    return normalized


def _current_user_node(*, profile: dict[str, Any], user_id: str) -> dict[str, Any]:
    email = _normalize_email(profile.get("mail") or profile.get("userPrincipalName"))
    label = str(profile.get("displayName") or email or "You")
    external_id = f"user:{email or profile.get('id') or user_id}"
    return {
        "id": external_id,
        "type": "user",
        "label": label,
        "title": label,
        "subtitle": email,
        "source": "nexushub",
        "metadata": {
            "email": email,
            "providerUserId": profile.get("id"),
            "localUserId": user_id,
        },
        "actions": [],
    }


def _payload_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        items = payload.get("value") or []
    elif isinstance(payload, list):
        items = payload
    else:
        items = []
    return [item for item in items if isinstance(item, dict)]


def _normalize_sources(
    sources: list[str] | tuple[str, ...] | None,
) -> tuple[str, ...]:
    if not sources:
        return CORE_SOURCES
    selected = tuple(source for source in sources if source in CORE_SOURCES)
    return selected or CORE_SOURCES


def _normalize_types(types: list[str] | tuple[str, ...] | None) -> tuple[str, ...]:
    if not types:
        return DEFAULT_TYPES
    aliases = {"people": "person", "docs": "document", "files": "document"}
    normalized = [aliases.get(type_name, type_name) for type_name in types]
    selected = tuple(type_name for type_name in normalized if type_name in DEFAULT_TYPES)
    return selected or DEFAULT_TYPES


def _filter_by_types(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    selected_types: tuple[str, ...],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    selected = set(selected_types)
    filtered_nodes = [node for node in nodes if node.get("type") in selected]
    node_ids = {node["id"] for node in filtered_nodes}
    filtered_edges = [
        edge
        for edge in edges
        if edge.get("source") in node_ids and edge.get("target") in node_ids
    ]
    return filtered_nodes, filtered_edges


def _initial_source_status(selected_sources: tuple[str, ...]) -> dict[str, dict[str, Any]]:
    return {
        source: (
            _source_skipped(source)
            if source not in selected_sources
            else {"source": source, "status": "skipped", "count": 0}
        )
        for source in CORE_SOURCES
    }


def _source_ok(source: str, count: int) -> dict[str, Any]:
    return {"source": source, "status": "ok", "count": count}


def _source_error(source: str, exc: Exception) -> dict[str, Any]:
    return {"source": source, "status": "error", "count": 0, "message": str(exc)}


def _source_skipped(source: str) -> dict[str, Any]:
    return {"source": source, "status": "skipped", "count": 0}


def _status_message(source_status: dict[str, dict[str, Any]]) -> str | None:
    messages = [
        str(status.get("message"))
        for status in source_status.values()
        if status.get("status") == "error" and status.get("message")
    ]
    return " ".join(messages) if messages else None


def _parse_time_range_days(time_range: str) -> int:
    value = str(time_range or "7d").strip().lower()
    if value.endswith("d"):
        value = value[:-1]
    try:
        days = int(value)
    except ValueError:
        return 7
    return min(max(days, 1), 90)


def _normalize_email(value: Any) -> str | None:
    if not value:
        return None
    email = str(value).strip().lower()
    return email or None
