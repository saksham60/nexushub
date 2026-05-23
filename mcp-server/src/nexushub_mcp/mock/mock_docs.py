from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Literal

ReportType = Literal["executive_summary", "budget_review", "project_status", "risk_report"]
Audience = Literal["leadership", "team", "client"]


def recent_files(*, max_results: int) -> dict[str, Any]:
    now = datetime.now(UTC)
    items = [
        {
            "fileId": "file_mock_001",
            "name": "Q2_Budget.xlsx",
            "extension": "xlsx",
            "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "webUrl": "https://contoso.sharepoint.com/sites/finance/Q2_Budget.xlsx",
            "lastModifiedAt": (now - timedelta(hours=2)).isoformat(),
            "sizeBytes": 642118,
        },
        {
            "fileId": "file_mock_002",
            "name": "Launch_Readiness.pptx",
            "extension": "pptx",
            "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "webUrl": "https://contoso.sharepoint.com/sites/product/Launch_Readiness.pptx",
            "lastModifiedAt": (now - timedelta(hours=7)).isoformat(),
            "sizeBytes": 1120042,
        },
        {
            "fileId": "file_mock_003",
            "name": "Vendor_Renewal_Contract.pdf",
            "extension": "pdf",
            "mimeType": "application/pdf",
            "webUrl": "https://contoso.sharepoint.com/sites/legal/Vendor_Renewal_Contract.pdf",
            "lastModifiedAt": (now - timedelta(days=1)).isoformat(),
            "sizeBytes": 890331,
        },
        {
            "fileId": "file_mock_004",
            "name": "Customer_Escalation_Notes.docx",
            "extension": "docx",
            "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "webUrl": "https://contoso.sharepoint.com/sites/cs/Customer_Escalation_Notes.docx",
            "lastModifiedAt": (now - timedelta(days=2)).isoformat(),
            "sizeBytes": 245933,
        },
    ]
    return {"count": len(items[:max_results]), "items": items[:max_results]}


def analyze_file(
    *, file_name: str, analysis_goal: str | None, physical_metadata: dict[str, Any] | None = None
) -> dict[str, Any]:
    extension = Path(file_name).suffix.lower().lstrip(".") or "unknown"
    metadata_note = (
        f"Local file detected with {physical_metadata.get('sizeBytes')} bytes."
        if physical_metadata
        else "Using mock analysis because no local uploaded file was found."
    )
    return {
        "fileName": file_name,
        "analysisGoal": analysis_goal
        or "Identify executive-ready insights, risks, and next actions.",
        "summary": (
            "The file indicates Q2 spend is trending above plan because vendor renewal costs "
            "increased while launch and support work stayed in scope."
        ),
        "keyMetrics": [
            {
                "metric": "Budget variance",
                "value": "+8.4%",
                "interpretation": "Above approved baseline",
            },
            {
                "metric": "Forecast confidence",
                "value": "Medium",
                "interpretation": "Depends on vendor renewal timing",
            },
            {
                "metric": "At-risk line items",
                "value": "3",
                "interpretation": "Vendor, launch contingency, support credits",
            },
        ],
        "risks": [
            "Approval delay could push procurement past the finance cutoff.",
            "Reducing analytics pilot funding may affect Q3 readiness.",
            "Contract assumptions need a named owner before sign-off.",
        ],
        "opportunities": [
            "Negotiate phased vendor billing to reduce Q2 pressure.",
            "Move low-priority pilot spend to Q3 without affecting launch date.",
            "Create a leadership summary with decision options and tradeoffs.",
        ],
        "reportOutline": [
            "Current state and decision required",
            "Budget variance drivers",
            "Risk and dependency register",
            "Recommended approval path",
        ],
        "suggestedCharts": [
            {"type": "waterfall", "title": "Q2 Budget Variance Drivers"},
            {"type": "bar", "title": "Spend by Workstream"},
            {"type": "risk_matrix", "title": "Approval Risks by Impact and Likelihood"},
        ],
        "metadata": {"extension": extension, "note": metadata_note},
    }


def build_report(*, file_name: str, report_type: ReportType, audience: Audience) -> dict[str, Any]:
    title_map = {
        "executive_summary": "Executive Summary",
        "budget_review": "Q2 Budget Review",
        "project_status": "Project Status Report",
        "risk_report": "Risk Review",
    }
    return {
        "reportTitle": f"{title_map[report_type]}: {file_name}",
        "audience": audience,
        "sections": [
            {
                "title": "Decision Snapshot",
                "bullets": [
                    "Approval is needed for revised Q2 vendor allocation.",
                    "Current plan is above baseline and needs leadership confirmation.",
                ],
            },
            {
                "title": "Key Findings",
                "bullets": [
                    "Vendor renewal is the main budget variance driver.",
                    "Launch date remains viable if approval lands before cutoff.",
                ],
            },
            {
                "title": "Risks and Mitigations",
                "bullets": [
                    "Approval delay: assign final owner and deadline.",
                    "Budget tradeoff: document which workstream shifts to Q3.",
                ],
            },
            {
                "title": "Recommended Next Actions",
                "bullets": [
                    "Confirm decision criteria with finance.",
                    "Send approval note with owner, deadline, and conditions.",
                ],
            },
        ],
        "executiveSummary": (
            "Q2 budget pressure is manageable if the vendor renewal decision is confirmed quickly "
            "and the analytics pilot tradeoff is documented."
        ),
        "chartsToInclude": [
            "Q2 Budget Variance Drivers",
            "Spend by Workstream",
            "Risk Matrix",
        ],
        "exportOptions": ["markdown", "docx-outline", "pptx-outline", "json"],
    }
