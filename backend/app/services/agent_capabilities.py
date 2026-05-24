from __future__ import annotations

from typing import Any

from app.services.mcp_client import get_mcp_health

DEFAULT_CAPABILITY_MESSAGE = (
    "Hi. I can help with your Microsoft 365 workspace: mail that needs reply, "
    "today's agenda, recent files, Teams action items, and pending approvals."
)


def is_capability_question(message: str) -> bool:
    normalized = message.lower()
    if "tool" in normalized and any(
        phrase in normalized
        for phrase in ("how many", "available", "list", "what tools", "which tools")
    ):
        return True
    return any(
        phrase in normalized
        for phrase in ("what can you do", "help", "capabilities", "available actions")
    )


async def build_direct_response(message: str) -> dict[str, Any]:
    if not is_capability_question(message):
        return {"message": DEFAULT_CAPABILITY_MESSAGE}

    try:
        health = await get_mcp_health()
    except Exception as exc:
        return {
            "message": (
                "I can help with mail, calendar, Teams, documents, and approvals, "
                f"but I could not reach the MCP tool catalog right now: {exc}"
            )
        }

    tools = (health.get("tools") or {}) if isinstance(health, dict) else {}
    categories = tools.get("categories") if isinstance(tools, dict) else []
    if not isinstance(categories, list):
        categories = []
    count = tools.get("count") if isinstance(tools, dict) else None
    if not isinstance(count, int):
        count = sum(
            len(category.get("tools") or [])
            for category in categories
            if isinstance(category, dict)
        )

    category_summaries = []
    for category in categories:
        if not isinstance(category, dict):
            continue
        category_tools = category.get("tools") or []
        if not isinstance(category_tools, list):
            category_tools = []
        category_summaries.append(f"{category.get('name', 'Tools')} ({len(category_tools)})")

    if not category_summaries:
        return {"message": f"NexusHub currently has {count} MCP tools available."}

    return {
        "message": (
            f"NexusHub currently has {count} MCP tools available across "
            f"{len(category_summaries)} categories: {', '.join(category_summaries)}."
        ),
        "tool_count": count,
        "categories": categories,
    }
