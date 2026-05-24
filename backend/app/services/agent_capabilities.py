from __future__ import annotations

from typing import Any

from app.services.tool_catalog_service import ToolCatalogService

DEFAULT_CAPABILITY_MESSAGE = (
    "Hi. I can help with your Microsoft 365 workspace: mail that needs reply, "
    "today's agenda, recent files, Teams action items, and pending approvals."
)


def is_capability_question(message: str) -> bool:
    normalized = message.lower().strip()
    if "tool" in normalized and any(
        phrase in normalized
        for phrase in ("how many", "available", "list", "what tools", "which tools")
    ):
        return True
    if normalized in {"help", "what can you do", "what can you do?", "capabilities"}:
        return True
    return any(phrase in normalized for phrase in ("available actions", "your capabilities"))


async def build_direct_response(message: str) -> dict[str, Any]:
    if not is_capability_question(message):
        return {"message": DEFAULT_CAPABILITY_MESSAGE}

    try:
        catalog = await ToolCatalogService().get_catalog()
    except Exception as exc:
        return {
            "message": (
                "I can help with mail, calendar, Teams, documents, and approvals, "
                f"but I could not reach the MCP tool catalog right now: {exc}"
            )
        }

    tools = catalog.get("tools") if isinstance(catalog, dict) else []
    if not isinstance(tools, list):
        tools = []
    count = int(catalog.get("count") or len(tools)) if isinstance(catalog, dict) else len(tools)
    grouped: dict[str, list[str]] = {}
    for tool in tools:
        if not isinstance(tool, dict):
            continue
        category = str(tool.get("category") or "tools")
        name = str(tool.get("name") or "")
        if name:
            grouped.setdefault(category, []).append(name)
    categories = [
        {"name": category, "tools": sorted(names)}
        for category, names in sorted(grouped.items())
    ]
    category_summaries = [
        f"{category['name']} ({len(category['tools'])})" for category in categories
    ]

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
