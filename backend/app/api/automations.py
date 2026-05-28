from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/automations", tags=["automations"])


@router.get("")
async def list_automations() -> dict[str, Any]:
    templates = [
        {
            "id": "morning_brief",
            "name": "Morning brief",
            "description": "Summarize priority mail, meetings, approvals, documents, and Teams signals.",
            "status": "available",
        },
        {
            "id": "draft_urgent_replies",
            "name": "Draft urgent replies",
            "description": "Prepare approval-gated Outlook reply drafts for urgent messages.",
            "status": "available",
        },
        {
            "id": "meeting_prep",
            "name": "Meeting prep",
            "description": "Generate a meeting brief with agenda, related mail, files, and risks.",
            "status": "available",
        },
        {
            "id": "document_intelligence_brief",
            "name": "Document intelligence brief",
            "description": "Analyze a document and generate executive summary, risks, and action items.",
            "status": "available",
        },
        {
            "id": "approval_digest",
            "name": "Approval digest",
            "description": "Collect pending approvals into a single review queue.",
            "status": "available",
        },
    ]
    return {
        "status": "ok",
        "templates": templates,
        "active": [],
        "runs": [],
    }
