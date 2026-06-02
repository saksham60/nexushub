from __future__ import annotations

import unittest
from unittest.mock import patch

from app.api.knowledge_graph import get_kg_service
from app.services.entity_extraction_service import EntityExtractionService
from app.services.knowledge_graph_repository import KnowledgeGraphRepository
from app.services.knowledge_graph_service import (
    KnowledgeGraphService,
    normalize_workspace_id,
)


USER_ID = "00000000-0000-4000-8000-000000000001"


class NoopRepository:
    def __init__(self) -> None:
        self.calls = []

    def persist_graph(self, **kwargs):
        self.calls.append(kwargs)
        return kwargs["nodes"], kwargs["edges"]


class FakeMicrosoftGraph:
    def __init__(self) -> None:
        self.calls = []

    async def get_me(self, user_id, workspace_id=None):
        self.calls.append(("get_me", workspace_id))
        return {
            "id": "m365-user-1",
            "displayName": "Nexus User",
            "mail": "me@example.com",
        }

    async def get_recent_messages(self, user_id, workspace_id=None, top=10):
        self.calls.append(("get_recent_messages", workspace_id, top))
        return {
            "value": [
                {
                    "id": "msg-1",
                    "conversationId": "thread-1",
                    "subject": "Budget follow-up",
                    "from": {"emailAddress": {"address": "alex@example.com", "name": "Alex"}},
                    "toRecipients": [
                        {"emailAddress": {"address": "me@example.com", "name": "Nexus User"}}
                    ],
                    "receivedDateTime": "2026-06-01T10:00:00Z",
                }
            ]
        }

    async def get_calendar_range(self, user_id, workspace_id=None, days=7, top=10):
        self.calls.append(("get_calendar_range", workspace_id, days, top))
        return {
            "value": [
                {
                    "id": "evt-1",
                    "subject": "Planning sync",
                    "organizer": {
                        "emailAddress": {"address": "alex@example.com", "name": "Alex"}
                    },
                    "attendees": [
                        {"emailAddress": {"address": "me@example.com", "name": "Nexus User"}},
                        {"emailAddress": {"address": "alex@example.com", "name": "Alex"}},
                    ],
                    "start": {"dateTime": "2026-06-02T09:00:00"},
                    "end": {"dateTime": "2026-06-02T09:30:00"},
                }
            ]
        }

    async def get_recent_files(self, user_id, workspace_id=None, top=10):
        self.calls.append(("get_recent_files", workspace_id, top))
        return {
            "value": [
                {
                    "id": "doc-1",
                    "name": "Roadmap.docx",
                    "webUrl": "https://example.com/doc",
                    "lastModifiedBy": {
                        "user": {"email": "alex@example.com", "displayName": "Alex"}
                    },
                }
            ]
        }


class KnowledgeGraphTests(unittest.IsolatedAsyncioTestCase):
    def test_dependency_constructs_without_settings_argument(self) -> None:
        self.assertIsInstance(get_kg_service(), KnowledgeGraphService)

    def test_normalizes_default_workspace(self) -> None:
        self.assertIsNone(normalize_workspace_id("default"))
        self.assertIsNone(normalize_workspace_id(""))
        self.assertEqual(normalize_workspace_id("workspace-1"), "workspace-1")

    async def test_build_calls_current_microsoft_methods_and_returns_graph(self) -> None:
        fake_graph = FakeMicrosoftGraph()
        repository = NoopRepository()
        graph = await KnowledgeGraphService(fake_graph, repository).build_knowledge_graph(
            user_id=USER_ID, workspace_id="default", limit=5, time_range="14d"
        )

        self.assertFalse(graph.degraded)
        self.assertGreaterEqual(graph.stats.totalNodes, 5)
        self.assertEqual(graph.sourceStatus["outlook"].status, "ok")
        self.assertEqual(graph.sourceStatus["calendar"].status, "ok")
        self.assertEqual(graph.sourceStatus["onedrive"].status, "ok")
        self.assertIn(("get_recent_messages", None, 5), fake_graph.calls)
        self.assertIn(("get_calendar_range", None, 14, 5), fake_graph.calls)
        self.assertIn(("get_recent_files", None, 5), fake_graph.calls)
        self.assertTrue(repository.calls)

    async def test_partial_source_failure_returns_partial_degraded_graph(self) -> None:
        class PartialGraph(FakeMicrosoftGraph):
            async def get_recent_messages(self, *args, **kwargs):
                raise RuntimeError("mail failed")

        graph = await KnowledgeGraphService(
            PartialGraph(), NoopRepository()
        ).build_knowledge_graph(user_id=USER_ID, workspace_id=None)

        self.assertTrue(graph.degraded)
        self.assertGreater(graph.stats.meetingCount, 0)
        self.assertEqual(graph.sourceStatus["outlook"].status, "error")
        self.assertEqual(graph.sourceStatus["calendar"].status, "ok")

    async def test_total_source_failure_returns_empty_degraded_graph(self) -> None:
        class BrokenGraph(FakeMicrosoftGraph):
            async def get_recent_messages(self, *args, **kwargs):
                raise RuntimeError("mail failed")

            async def get_calendar_range(self, *args, **kwargs):
                raise RuntimeError("calendar failed")

            async def get_recent_files(self, *args, **kwargs):
                raise RuntimeError("files failed")

        graph = await KnowledgeGraphService(
            BrokenGraph(), NoopRepository()
        ).build_knowledge_graph(user_id=USER_ID, workspace_id=None)

        self.assertTrue(graph.degraded)
        self.assertEqual(graph.stats.totalNodes, 0)
        self.assertEqual(graph.sourceStatus["onedrive"].status, "error")

    def test_extractors_emit_semantic_edge_direction(self) -> None:
        fragment = EntityExtractionService().extract_from_emails(
            [
                {
                    "id": "msg-1",
                    "subject": "Hello",
                    "from": {
                        "emailAddress": {"address": "alex@example.com", "name": "Alex"}
                    },
                    "toRecipients": [],
                }
            ]
        )

        sent_by = next(edge for edge in fragment.edges if edge["type"] == "sent_by")
        self.assertEqual(sent_by["source"], "email:msg-1")
        self.assertEqual(sent_by["target"], "person:alex@example.com")


class KnowledgeGraphRepositoryTests(unittest.TestCase):
    def test_repository_upserts_nodes_and_edges_with_mocked_supabase(self) -> None:
        fake_supabase = FakeSupabase()
        repository = KnowledgeGraphRepository()
        nodes = [
            {
                "id": "user:me@example.com",
                "type": "user",
                "label": "Me",
                "source": "nexushub",
                "metadata": {"email": "me@example.com"},
                "actions": [],
            },
            {
                "id": "email:msg-1",
                "type": "email",
                "label": "Hello",
                "source": "outlook",
                "metadata": {},
                "actions": [],
            },
        ]
        edges = [
            {
                "id": "user:me@example.com:related_to:email:msg-1",
                "source": "user:me@example.com",
                "target": "email:msg-1",
                "type": "related_to",
                "sourceSystem": "nexushub",
                "weight": 0.1,
                "metadata": {},
            }
        ]

        with patch(
            "app.services.knowledge_graph_repository.get_supabase",
            return_value=fake_supabase,
        ):
            first_nodes, first_edges = repository.persist_graph(
                user_id=USER_ID, workspace_id=None, nodes=nodes, edges=edges
            )
            second_nodes, second_edges = repository.persist_graph(
                user_id=USER_ID, workspace_id=None, nodes=nodes, edges=edges
            )

        self.assertEqual(len(fake_supabase.tables["knowledge_nodes"]), 2)
        self.assertEqual(len(fake_supabase.tables["knowledge_edges"]), 1)
        self.assertEqual(first_edges[0]["source"], first_nodes[0]["id"])
        self.assertEqual(second_edges[0]["target"], second_nodes[1]["id"])


class FakeSupabase:
    def __init__(self) -> None:
        self.tables = {"knowledge_nodes": [], "knowledge_edges": []}

    def table(self, name: str):
        return FakeTable(self, name)


class FakeTable:
    def __init__(self, supabase: FakeSupabase, name: str) -> None:
        self.supabase = supabase
        self.name = name
        self.operation = "select"
        self.filters = []
        self.payload = None
        self.max_rows = None

    def select(self, *_args):
        self.operation = "select"
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = dict(payload)
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = dict(payload)
        return self

    def eq(self, key, value):
        self.filters.append((key, value))
        return self

    def is_(self, key, value):
        if value == "null":
            self.filters.append((key, None))
        return self

    def limit(self, value):
        self.max_rows = value
        return self

    def execute(self):
        rows = self.supabase.tables[self.name]
        if self.operation == "insert":
            record = dict(self.payload or {})
            record["id"] = f"{self.name}-{len(rows) + 1}"
            rows.append(record)
            return FakeResponse([record])

        matches = [row for row in rows if self._matches(row)]
        if self.max_rows is not None:
            matches = matches[: self.max_rows]

        if self.operation == "update":
            updated = []
            for row in rows:
                if self._matches(row):
                    row.update(self.payload or {})
                    updated.append(dict(row))
            return FakeResponse(updated[: self.max_rows] if self.max_rows else updated)

        return FakeResponse([dict(row) for row in matches])

    def _matches(self, row):
        return all(row.get(key) == value for key, value in self.filters)


class FakeResponse:
    def __init__(self, data):
        self.data = data


if __name__ == "__main__":
    unittest.main()
