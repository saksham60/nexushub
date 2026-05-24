from __future__ import annotations

from typing import Any

from app.services.mcp_client import get_mcp_health

TOOL_METADATA: dict[str, dict[str, Any]] = {
    "auth_get_status": {
        "category": "auth",
        "description": "Check whether Microsoft 365 is connected.",
        "inputSchema": {},
        "requiresApproval": False,
    },
    "mail_find_needs_reply": {
        "category": "mail",
        "description": "Find Outlook emails that likely need a reply.",
        "inputSchema": {"days": "number", "maxResults": "number", "priority": "all|high|medium|low"},
        "requiresApproval": False,
    },
    "mail_find_awaiting_approval": {
        "category": "mail",
        "description": "Find emails that mention approvals, reviews, contracts, budgets, or invoices.",
        "inputSchema": {"days": "number", "maxResults": "number"},
        "requiresApproval": False,
    },
    "mail_summarize_thread": {
        "category": "mail",
        "description": "Summarize an email thread when a messageId or threadId is available.",
        "inputSchema": {"threadId": "string", "messageId": "string"},
        "requiresApproval": False,
    },
    "mail_create_draft_reply": {
        "category": "mail",
        "description": "Prepare an approval-gated draft email reply. Never sends email.",
        "inputSchema": {"to": "string[]", "subject": "string", "context": "string", "tone": "string"},
        "requiresApproval": True,
    },
    "mail_mark_as_read": {
        "category": "mail",
        "description": "Prepare an approval-gated request to mark selected emails as read.",
        "inputSchema": {"messageIds": "string[]"},
        "requiresApproval": True,
    },
    "calendar_get_today_agenda": {
        "category": "calendar",
        "description": "Get today's Outlook calendar agenda.",
        "inputSchema": {"timezone": "string"},
        "requiresApproval": False,
    },
    "calendar_find_focus_blocks": {
        "category": "calendar",
        "description": "Suggest focus blocks from the calendar.",
        "inputSchema": {"date": "string", "timezone": "string", "minBlockMinutes": "number"},
        "requiresApproval": False,
    },
    "calendar_prepare_meeting_brief": {
        "category": "calendar",
        "description": "Prepare a brief for an upcoming meeting.",
        "inputSchema": {"eventId": "string", "meetingTitle": "string"},
        "requiresApproval": False,
    },
    "docs_list_recent_files": {
        "category": "documents",
        "description": "List recent OneDrive or SharePoint files.",
        "inputSchema": {"maxResults": "number"},
        "requiresApproval": False,
    },
    "docs_analyze_uploaded_file": {
        "category": "documents",
        "description": "Analyze an uploaded document by document id.",
        "inputSchema": {"fileName": "documentId", "analysisGoal": "string"},
        "requiresApproval": False,
    },
    "docs_build_report": {
        "category": "documents",
        "description": "Build a report from an uploaded document by document id.",
        "inputSchema": {"fileName": "documentId", "reportType": "string", "audience": "string"},
        "requiresApproval": False,
    },
    "approval_list_pending": {
        "category": "approvals",
        "description": "List pending approval-gated actions.",
        "inputSchema": {"maxResults": "number"},
        "requiresApproval": False,
    },
    "approval_execute": {
        "category": "approvals",
        "description": "Execute a previously approved action.",
        "inputSchema": {"approvalId": "string", "approved": "boolean"},
        "requiresApproval": True,
    },
    "teams_get_urgent_mentions": {
        "category": "teams",
        "description": "Find urgent Teams mentions if Teams support is enabled.",
        "inputSchema": {"days": "number", "maxResults": "number"},
        "requiresApproval": False,
    },
    "teams_get_meeting_summaries": {
        "category": "teams",
        "description": "Return recent Teams meeting summaries if Teams support is enabled.",
        "inputSchema": {"days": "number", "maxResults": "number"},
        "requiresApproval": False,
    },
    "teams_extract_action_items": {
        "category": "teams",
        "description": "Extract action items from supplied Teams or chat text.",
        "inputSchema": {"text": "string"},
        "requiresApproval": False,
    },
}

CATEGORY_SLUGS = {
    "mail pilot": "mail",
    "daypilot": "calendar",
    "doc insights": "documents",
    "approvals": "approvals",
    "teamspace": "teams",
    "auth": "auth",
}


class ToolCatalogService:
    async def get_catalog(self) -> dict[str, Any]:
        health = await get_mcp_health()
        tools_payload = health.get("tools") if isinstance(health, dict) else {}
        categories_payload = (
            tools_payload.get("categories")
            if isinstance(tools_payload, dict) and isinstance(tools_payload.get("categories"), list)
            else []
        )
        tools: list[dict[str, Any]] = []
        categories: list[str] = []
        for category in categories_payload:
            if not isinstance(category, dict):
                continue
            category_name = _category_slug(str(category.get("name") or "tools"))
            if category_name not in categories:
                categories.append(category_name)
            for tool_name in category.get("tools") or []:
                if not isinstance(tool_name, str):
                    continue
                metadata = TOOL_METADATA.get(tool_name, {})
                tools.append(
                    {
                        "name": tool_name,
                        "category": metadata.get("category") or category_name,
                        "description": metadata.get("description") or f"{tool_name} tool.",
                        "inputSchema": metadata.get("inputSchema") or {},
                        "requiresApproval": bool(metadata.get("requiresApproval")),
                    }
                )
        return {
            "tools": tools,
            "count": len(tools),
            "categories": sorted(set(categories or [tool["category"] for tool in tools])),
        }


def _category_slug(value: str) -> str:
    normalized = value.strip().lower()
    return CATEGORY_SLUGS.get(normalized, normalized.replace(" ", "_"))
