from __future__ import annotations

from typing import Any

TOOL_CATEGORIES: tuple[dict[str, Any], ...] = (
    {
        "name": "Mail Pilot",
        "tools": (
            "mail_find_needs_reply",
            "mail_find_awaiting_approval",
            "mail_summarize_thread",
            "mail_create_draft_reply",
            "mail_mark_as_read",
        ),
    },
    {
        "name": "DayPilot",
        "tools": (
            "calendar_get_today_agenda",
            "calendar_find_focus_blocks",
            "calendar_prepare_meeting_brief",
            "calendar_reschedule_event",
        ),
    },
    {
        "name": "TeamSpace",
        "tools": (
            "teams_get_urgent_mentions",
            "teams_get_meeting_summaries",
            "teams_extract_action_items",
        ),
    },
    {
        "name": "Doc Insights",
        "tools": (
            "docs_list_recent_files",
            "docs_analyze_uploaded_file",
            "docs_build_report",
        ),
    },
    {"name": "Approvals", "tools": ("approval_list_pending", "approval_execute")},
    {"name": "Auth", "tools": ("auth_get_status", "auth_get_login_url")},
)


def tool_catalog() -> dict[str, Any]:
    categories = [
        {"name": category["name"], "tools": list(category["tools"])}
        for category in TOOL_CATEGORIES
    ]
    return {
        "count": sum(len(category["tools"]) for category in categories),
        "categories": categories,
    }
