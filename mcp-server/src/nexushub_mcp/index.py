from __future__ import annotations

from nexushub_mcp.config import Settings
from nexushub_mcp.server.mcp_server import create_mcp_server
from nexushub_mcp.server.transports import run_server
from nexushub_mcp.utils.logger import configure_logging


def main() -> None:
    settings = Settings.from_env()
    configure_logging(settings.log_level)
    mcp = create_mcp_server(settings)
    run_server(mcp, settings)
