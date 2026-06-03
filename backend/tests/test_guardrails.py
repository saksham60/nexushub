from __future__ import annotations

import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch
from zoneinfo import ZoneInfo

from app.config import Settings
from app.core.errors import (
    DocumentParsingError,
    FeatureDisabledError,
    LLMUnavailableError,
    UnsupportedDocumentError,
)
from app.services.document_service import DocumentService
from app.services.agent_orchestrator import _execution_canvas_for_response
from app.services.semantic_agent_router import SemanticAgentRouter
from app.services.tool_catalog_service import ToolCatalogService


class SuccessfulLLM:
    async def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        return {
            "title": "Real Report",
            "report": "Report based on extracted source content.",
            "sections": [{"heading": "Summary", "content": "Source-backed summary."}],
            "summary": "Source-backed summary.",
            "keyPoints": ["Uses uploaded text"],
            "risks": [],
            "actionItems": [],
            "confidence": 0.82,
        }


class FailingLLM:
    async def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        raise RuntimeError("llm down")


class LowConfidenceLLM:
    async def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        return {
            "intent": "ambiguous",
            "toolName": "mail_find_needs_reply",
            "arguments": {},
            "confidence": 0.2,
            "reason": "The request is ambiguous.",
            "requiresClarification": False,
            "clarificationQuestion": None,
        }


class UnknownToolLLM:
    async def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        return {
            "intent": "unknown",
            "toolName": "not_a_real_tool",
            "arguments": {},
            "confidence": 0.95,
            "reason": "The request asks for an unavailable tool.",
            "requiresClarification": False,
            "clarificationQuestion": None,
        }


class ToolCatalog:
    async def get_catalog(self) -> dict[str, Any]:
        return {
            "tools": [
                {
                    "name": "mail_find_needs_reply",
                    "category": "mail",
                    "description": "Find mail needing reply.",
                    "inputSchema": {},
                    "requiresApproval": False,
                }
            ],
            "count": 1,
            "categories": ["mail"],
        }


class CalendarCatalog:
    async def get_catalog(self) -> dict[str, Any]:
        return {
            "tools": [
                {
                    "name": "calendar_schedule_meeting",
                    "category": "calendar",
                    "description": "Prepare an approval-gated Outlook meeting invite.",
                    "inputSchema": {
                        "subject": "string",
                        "startTime": "ISO datetime or natural time",
                        "endTime": "ISO datetime or natural time",
                        "attendees": "string[]",
                        "timezone": "IANA timezone",
                    },
                    "requiresApproval": True,
                }
            ],
            "count": 1,
            "categories": ["calendar"],
        }


class FailingCatalog:
    async def get_catalog(self) -> dict[str, Any]:
        raise RuntimeError("mcp unavailable")


class DocumentGuardrailTests(unittest.IsolatedAsyncioTestCase):
    def test_unsupported_file_type_is_rejected(self) -> None:
        service = DocumentService(settings=Settings())
        with self.assertRaises(UnsupportedDocumentError):
            service._validate_file(
                filename="payload.exe",
                extension=".exe",
                content_type="application/x-msdownload",
            )

    def test_common_business_document_types_are_allowed(self) -> None:
        service = DocumentService(settings=Settings())
        for filename, content_type in (
            ("deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            ("notes.md", "text/markdown"),
            ("brief.html", "text/html"),
        ):
            with self.subTest(filename=filename):
                service._validate_file(
                    filename=filename,
                    extension=Path(filename).suffix,
                    content_type=content_type,
                )

    def test_empty_text_extraction_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            _write_document(tempdir=tempdir, document_id="empty", filename="empty.txt", content="")
            service = DocumentService(settings=Settings(document_upload_dir=tempdir))
            with self.assertRaises(DocumentParsingError):
                service.extract("empty")

    async def test_llm_unavailable_does_not_fake_analysis(self) -> None:
        os.environ["NEXT_PUBLIC_DEMO_MODE"] = "false"
        with tempfile.TemporaryDirectory() as tempdir:
            _write_document(
                tempdir=tempdir,
                document_id="real",
                filename="real.txt",
                content="The renewal risk needs review by Friday.",
            )
            service = DocumentService(
                settings=Settings(document_upload_dir=tempdir),
                llm=FailingLLM(),
            )
            with self.assertRaises(LLMUnavailableError):
                await service.analyze(
                    document_id="real",
                    analysis_type="executive_brief",
                    instructions="Summarize",
                )

    async def test_feature_flag_disabled_returns_real_error(self) -> None:
        service = DocumentService(
            settings=Settings(enable_real_document_analysis=False),
            llm=SuccessfulLLM(),
        )
        with self.assertRaises(FeatureDisabledError):
            await service.report(
                document_id="any",
                report_title="Report",
                instructions="",
                report_format="executive_summary",
            )

    async def test_report_includes_debug_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            _write_document(
                tempdir=tempdir,
                document_id="brief",
                filename="brief.txt",
                content="Revenue increased 12%. Action item: review renewal risk.",
            )
            service = DocumentService(
                settings=Settings(document_upload_dir=tempdir),
                llm=SuccessfulLLM(),
            )
            report = await service.report(
                document_id="brief",
                report_title="Brief",
                instructions="",
                report_format="executive_summary",
            )
            self.assertEqual(report["filename"], "brief.txt")
            self.assertEqual(report["llmStatus"], "ok")
            self.assertEqual(report["sourceStats"]["parser"], "text")
            self.assertGreater(report["sourceStats"]["charactersExtracted"], 0)
            self.assertIn("createdAt", report)


class SemanticRouterGuardrailTests(unittest.IsolatedAsyncioTestCase):
    async def test_mcp_catalog_unavailable_returns_error(self) -> None:
        decision = await SemanticAgentRouter(
            llm=LowConfidenceLLM(),
            catalog_service=FailingCatalog(),
        ).route(user_id="u", workspace_id=None, message="Find my work")
        self.assertEqual(decision.response_type, "error")
        self.assertEqual(decision.error_code, "TOOL_CATALOG_UNAVAILABLE")

    async def test_ambiguous_command_asks_clarification(self) -> None:
        decision = await SemanticAgentRouter(
            llm=LowConfidenceLLM(),
            catalog_service=ToolCatalog(),
        ).route(user_id="u", workspace_id=None, message="Can you handle this?")
        self.assertEqual(decision.response_type, "clarification")

    async def test_unknown_tool_request_asks_clarification(self) -> None:
        decision = await SemanticAgentRouter(
            llm=UnknownToolLLM(),
            catalog_service=ToolCatalog(),
        ).route(user_id="u", workspace_id=None, message="Run a payroll reconciliation")
        self.assertEqual(decision.response_type, "clarification")

    async def test_semantic_router_flag_disabled_returns_error(self) -> None:
        decision = await SemanticAgentRouter(
            llm=LowConfidenceLLM(),
            catalog_service=ToolCatalog(),
            settings=Settings(enable_semantic_router=False),
        ).route(user_id="u", workspace_id=None, message="Find emails I need to answer")
        self.assertEqual(decision.response_type, "error")
        self.assertEqual(decision.error_code, "FEATURE_DISABLED")

    async def test_schedule_prompt_uses_deterministic_route_without_llm(self) -> None:
        decision = await SemanticAgentRouter(
            llm=FailingLLM(),
            catalog_service=CalendarCatalog(),
        ).route(
            user_id="u",
            workspace_id=None,
            message="setup a meeting with sakshamshady@gmail.com at 9 pm ist tomorrow",
        )

        self.assertEqual(decision.response_type, "tool")
        self.assertEqual(decision.tool_name, "calendar_schedule_meeting")
        self.assertTrue(decision.requires_approval)
        args = decision.arguments or {}
        self.assertEqual(args["attendees"], ["sakshamshady@gmail.com"])
        self.assertEqual(args["subject"], "Meeting with sakshamshady@gmail.com")
        self.assertEqual(args["timezone"], "Asia/Kolkata")
        start = datetime.fromisoformat(str(args["startTime"]))
        expected_date = datetime.now(ZoneInfo("Asia/Kolkata")).date() + timedelta(days=1)
        self.assertEqual(start.date(), expected_date)
        self.assertEqual(start.hour, 21)
        self.assertEqual(start.minute, 0)
        self.assertEqual(start.utcoffset(), timedelta(hours=5, minutes=30))


class ToolCatalogServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_tool_catalog_falls_back_to_static_metadata(self) -> None:
        with patch(
            "app.services.tool_catalog_service.get_mcp_health",
            new=AsyncMock(side_effect=RuntimeError("mcp sleeping")),
        ):
            catalog = await ToolCatalogService().get_catalog()

        tool_names = {tool["name"] for tool in catalog["tools"]}
        self.assertEqual(catalog["source"], "static_fallback")
        self.assertIn("calendar_schedule_meeting", tool_names)


class AgentExecutionCanvasTests(unittest.TestCase):
    def test_calendar_execution_canvas_includes_top_level_approval_id(self) -> None:
        canvas = _execution_canvas_for_response(
            {
                "type": "approval_required",
                "message": "Review meeting schedule",
                "toolUsed": "calendar_reschedule_event",
                "approvalId": "approval-1",
                "data": {
                    "arguments": {
                        "targetStartTime": "2026-06-03T21:00:00+05:30",
                    }
                },
            }
        )

        self.assertIsNotNone(canvas)
        assert canvas is not None
        self.assertEqual(canvas["type"], "schedule_meeting")
        self.assertEqual(canvas["payload"]["approvalId"], "approval-1")


def _write_document(*, tempdir: str, document_id: str, filename: str, content: str) -> None:
    upload_dir = Path(tempdir)
    extension = Path(filename).suffix
    (upload_dir / f"{document_id}{extension}").write_text(content, encoding="utf-8")
    (upload_dir / f"{document_id}.json").write_text(
        json.dumps(
            {
                "documentId": document_id,
                "filename": filename,
                "contentType": "text/plain",
                "sizeBytes": len(content.encode("utf-8")),
                "extension": extension,
                "createdAt": "2026-05-24T00:00:00+00:00",
                "userId": "test",
            }
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    unittest.main()
