from __future__ import annotations

from typing import Any

import uvicorn
from mcp.server.fastmcp import FastMCP

from nexushub_mcp.config import Settings
from nexushub_mcp.utils.logger import get_logger

logger = get_logger(__name__)


def run_server(mcp: FastMCP[Any], settings: Settings) -> None:
    if settings.transport == "stdio":
        logger.info(
            "starting_mcp_stdio", extra={"metadata": {"transport": "stdio", "mode": settings.mode}}
        )
        mcp.run(transport="stdio")
        return

    if settings.transport == "streamable-http":
        logger.info(
            "starting_mcp_streamable_http",
            extra={
                "metadata": {
                    "transport": "streamable-http",
                    "mode": settings.mode,
                    "host": settings.host,
                    "port": settings.port,
                    "path": settings.http_path,
                }
            },
        )
        uvicorn.run("nexushub_mcp.asgi:app", host=settings.host, port=settings.port)
        return

    logger.info(
        "starting_mcp_sse",
        extra={
            "metadata": {
                "transport": "sse",
                "mode": settings.mode,
                "host": settings.host,
                "port": settings.port,
            }
        },
    )
    mcp.run(transport="sse")
