from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse

from nexushub_mcp.approvals.approval_store import InMemoryApprovalStore
from nexushub_mcp.clients.backend_internal_client import BackendInternalClient
from nexushub_mcp.config import Settings
from nexushub_mcp.server.context import NexusHubRuntime
from nexushub_mcp.tools.register_tools import register_tools

SERVER_INSTRUCTIONS = """
NexusHub is an MCP-native Microsoft 365 execution workspace.
The frontend talks to the backend. The backend owns Microsoft OAuth, tokens,
sessions, orchestration, approvals, and audit logs. This MCP server owns tool
definitions and calls backend internal APIs in graph mode.
""".strip()


def build_runtime(settings: Settings) -> NexusHubRuntime:
    return NexusHubRuntime(
        settings=settings,
        approval_store=InMemoryApprovalStore(),
        backend_client=BackendInternalClient(settings),
    )


def create_mcp_server(settings: Settings | None = None) -> FastMCP[Any]:
    settings = settings or Settings.from_env()
    runtime = build_runtime(settings)
    mcp: FastMCP[Any] = FastMCP(
        name="NexusHub MCP Server",
        instructions=SERVER_INSTRUCTIONS,
        host=settings.host,
        port=settings.port,
        streamable_http_path=settings.http_path,
        stateless_http=True,
        json_response=True,
        log_level=settings.log_level,  # type: ignore[arg-type]
    )
    register_tools(mcp, runtime)
    register_resources_and_prompts(mcp, settings)
    return mcp


def register_resources_and_prompts(mcp: FastMCP[Any], settings: Settings) -> None:
    @mcp.resource("nexushub://status", description="NexusHub server status and active mode.")
    def nexushub_status() -> dict[str, Any]:
        return {
            "name": "NexusHub MCP Server",
            "version": "0.2.0",
            "mode": settings.mode,
            "transport": settings.transport,
            "source": settings.source,
            "backendInternalUrl": settings.backend_internal_url,
            "writeSafety": "approval_required",
            "ownsOAuth": False,
            "storesMicrosoftTokens": False,
        }

    @mcp.resource(
        "nexushub://modules", description="NexusHub product modules exposed as MCP tools."
    )
    def nexushub_modules() -> dict[str, Any]:
        return {
            "modules": [
                {
                    "name": "Mail Pilot",
                    "tools": [
                        "mail_find_needs_reply",
                        "mail_find_awaiting_approval",
                        "mail_summarize_thread",
                        "mail_create_draft_reply",
                        "mail_mark_as_read",
                    ],
                },
                {
                    "name": "DayPilot",
                    "tools": [
                        "calendar_get_today_agenda",
                        "calendar_find_focus_blocks",
                        "calendar_prepare_meeting_brief",
                    ],
                },
                {
                    "name": "TeamSpace",
                    "tools": [
                        "teams_get_urgent_mentions",
                        "teams_get_meeting_summaries",
                        "teams_extract_action_items",
                    ],
                },
                {
                    "name": "Doc Insights",
                    "tools": [
                        "docs_list_recent_files",
                        "docs_analyze_uploaded_file",
                        "docs_build_report",
                    ],
                },
                {"name": "Approvals", "tools": ["approval_list_pending", "approval_execute"]},
                {"name": "Auth", "tools": ["auth_get_status", "auth_get_login_url"]},
            ]
        }

    @mcp.prompt(description="Plan a concise NexusHub workday briefing.")
    def nexushub_daily_brief_prompt() -> str:
        return (
            "Use NexusHub tools to inspect today's agenda, mail that needs replies, urgent Teams "
            "mentions, and recent files. Summarize priorities, risks, and next actions. "
            "Do not execute write actions without approval."
        )

    @mcp.custom_route("/health", methods=["GET"])
    async def health_check(_: Request) -> JSONResponse:
        return JSONResponse(
            {
                "status": "ok",
                "service": "nexushub-mcp-server",
                "mode": settings.mode,
            }
        )
