from __future__ import annotations

from typing import Any

from nexushub_mcp.server.context import NexusHubRuntime
from nexushub_mcp.tools.approval_tools import register_approval_tools
from nexushub_mcp.tools.auth_tools import register_auth_tools
from nexushub_mcp.tools.calendar_tools import register_calendar_tools
from nexushub_mcp.tools.doc_tools import register_doc_tools
from nexushub_mcp.tools.mail_tools import register_mail_tools
from nexushub_mcp.tools.teams_tools import register_teams_tools


def register_tools(mcp: Any, runtime: NexusHubRuntime) -> None:
    register_auth_tools(mcp, runtime)
    register_mail_tools(mcp, runtime)
    register_calendar_tools(mcp, runtime)
    register_teams_tools(mcp, runtime)
    register_doc_tools(mcp, runtime)
    register_approval_tools(mcp, runtime)
