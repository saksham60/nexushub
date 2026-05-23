from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

from nexushub_mcp.config import Settings
from nexushub_mcp.server.mcp_server import create_mcp_server
from nexushub_mcp.utils.logger import configure_logging

settings = Settings.from_env()
configure_logging(settings.log_level)
mcp = create_mcp_server(settings)
mcp_app = mcp.streamable_http_app()


@asynccontextmanager
async def lifespan(_: Starlette) -> Any:
    async with mcp.session_manager.run():
        yield


async def health(_: Request) -> JSONResponse:
    return JSONResponse(
        {
            "status": "ok",
            "service": "nexushub-mcp-server",
            "mode": settings.mode,
        }
    )


async def call_tool(request: Request) -> JSONResponse:
    expected = settings.internal_service_token
    if expected and request.headers.get("authorization") != f"Bearer {expected}":
        return JSONResponse(
            {
                "status": "error",
                "error": {"code": "unauthorized", "message": "Invalid internal token."},
            },
            status_code=401,
        )
    if not expected:
        return JSONResponse(
            {
                "status": "error",
                "error": {
                    "code": "internal_service_token_missing",
                    "message": "MCP INTERNAL_SERVICE_TOKEN is not configured.",
                },
            },
            status_code=500,
        )

    body = await request.json()
    arguments = body.get("arguments", {}) if isinstance(body, dict) else {}
    if not isinstance(arguments, dict):
        return JSONResponse(
            {
                "status": "error",
                "error": {"code": "invalid_arguments", "message": "arguments must be an object."},
            },
            status_code=400,
        )
    tool_name = request.path_params["tool_name"]
    try:
        result = await mcp.call_tool(tool_name, arguments)
    except Exception as exc:
        return JSONResponse(
            {"status": "error", "error": {"code": "tool_call_failed", "message": str(exc)}},
            status_code=500,
        )

    structured = result[1] if isinstance(result, tuple) and len(result) > 1 else None
    return JSONResponse({"status": "ok", "result": structured})


starlette_app: Any = Starlette(
    routes=[
        Route("/health", endpoint=health, methods=["GET"]),
        Route("/tools/{tool_name}", endpoint=call_tool, methods=["POST"]),
        Mount("/", app=mcp_app),
    ],
    lifespan=lifespan,
)

if settings.allowed_origins:
    starlette_app = CORSMiddleware(
        starlette_app,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Mcp-Session-Id", "MCP-Protocol-Version"],
        expose_headers=["Mcp-Session-Id"],
    )

app = starlette_app
