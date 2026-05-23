from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from nexushub_mcp.clients.backend_internal_client import BackendInternalClientError
from nexushub_mcp.mock import mock_docs
from nexushub_mcp.server.context import NexusHubRuntime
from nexushub_mcp.tools.common import ensure_user_id
from nexushub_mcp.utils.logger import get_logger, log_tool_call
from nexushub_mcp.utils.response import ok

ReportType = Literal["executive_summary", "budget_review", "project_status", "risk_report"]
Audience = Literal["leadership", "team", "client"]

logger = get_logger(__name__)


def register_doc_tools(mcp: Any, runtime: NexusHubRuntime) -> None:
    @mcp.tool(description="List recent files from OneDrive or SharePoint.")
    async def docs_list_recent_files(
        user_id: str | None = None,
        workspace_id: str | None = None,
        maxResults: int = 10,
    ) -> dict[str, Any]:
        log_tool_call(
            logger, "docs_list_recent_files", {"maxResults": maxResults, "hasUserId": bool(user_id)}
        )
        max_results = max(1, min(maxResults, 50))
        if runtime.settings.mode == "mock":
            return ok("mock", mock_docs.recent_files(max_results=max_results))
        missing = ensure_user_id(runtime.settings.mode, user_id)
        if missing:
            return missing
        try:
            data = await runtime.backend_client.get_recent_files(
                user_id=user_id or "", workspace_id=workspace_id, top=max_results
            )
        except BackendInternalClientError as exc:
            return exc.to_mcp_response()
        return ok("microsoft_graph", data.get("data") or data)

    @mcp.tool(description="Analyze an uploaded file or mock workbook.")
    async def docs_analyze_uploaded_file(
        fileName: str,
        analysisGoal: str | None = None,
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "docs_analyze_uploaded_file",
            {"fileName": Path(fileName).name, "hasAnalysisGoal": bool(analysisGoal)},
        )
        metadata = _safe_local_file_metadata(runtime, fileName)
        return ok(
            "mock",
            mock_docs.analyze_file(
                file_name=Path(fileName).name,
                analysis_goal=analysisGoal,
                physical_metadata=metadata,
            ),
        )

    @mcp.tool(description="Build a report outline from document analysis.")
    async def docs_build_report(
        fileName: str,
        reportType: ReportType = "executive_summary",
        audience: Audience = "leadership",
    ) -> dict[str, Any]:
        log_tool_call(
            logger,
            "docs_build_report",
            {"fileName": Path(fileName).name, "reportType": reportType, "audience": audience},
        )
        return ok(
            "mock",
            mock_docs.build_report(
                file_name=Path(fileName).name, report_type=reportType, audience=audience
            ),
        )


def _safe_local_file_metadata(runtime: NexusHubRuntime, file_name: str) -> dict[str, Any] | None:
    upload_dir = runtime.settings.local_upload_dir
    candidate = (upload_dir / Path(file_name).name).resolve()
    if not candidate.is_relative_to(upload_dir):
        return None
    if not candidate.exists() or not candidate.is_file():
        return None
    stat = candidate.stat()
    return {
        "path": str(candidate),
        "sizeBytes": stat.st_size,
        "extension": candidate.suffix.lower().lstrip("."),
    }
