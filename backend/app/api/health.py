from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Query

from app.config import get_settings
from app.core.errors import AuthenticationRequiredError
from app.services.mcp_client import get_mcp_health
from app.services.microsoft_connection_service import MicrosoftConnectionService
from app.services.microsoft_token_service import get_valid_microsoft_access_token

router = APIRouter()
DEFAULT_MCP_HEALTH_TIMEOUT_MS = 900


@router.get("/health")
async def health(
    user_id: str | None = Query(default=None),
    include_dependencies: bool = Query(
        default=False,
        description="When true, probe MCP/Microsoft dependencies with tight timeouts.",
    ),
    mcp_timeout_ms: int = Query(
        default=DEFAULT_MCP_HEALTH_TIMEOUT_MS,
        ge=100,
        le=5000,
        description="Maximum time to wait for MCP dependency status.",
    ),
) -> dict[str, Any]:
    settings = get_settings()
    response: dict[str, Any] = {
        "status": "ok",
        "service": "nexushub-backend",
        "backend": {
            "status": "ok",
            "service": "nexushub-backend",
            "url": settings.backend_url,
        },
        "dependencies": {
            "mcp": _not_checked("nexushub-mcp-server"),
            "microsoft": _not_checked("microsoft-graph"),
        },
    }
    if not include_dependencies:
        return response

    dependencies = await dependency_health(
        user_id=user_id, mcp_timeout_ms=mcp_timeout_ms
    )
    response["dependencies"] = dependencies["dependencies"]
    return response


@router.get("/health/dependencies")
async def dependency_health(
    user_id: str | None = Query(default=None),
    mcp_timeout_ms: int = Query(default=DEFAULT_MCP_HEALTH_TIMEOUT_MS, ge=100, le=5000),
) -> dict[str, Any]:
    mcp = await _mcp_dependency_status(mcp_timeout_ms=mcp_timeout_ms)
    microsoft = await _microsoft_dependency_status(user_id=user_id)
    return {
        "status": "ok",
        "service": "nexushub-backend",
        "dependencies": {
            "mcp": mcp,
            "microsoft": microsoft,
        },
    }


async def _mcp_dependency_status(*, mcp_timeout_ms: int) -> dict[str, Any]:
    timeout_seconds = max(mcp_timeout_ms, 100) / 1000
    try:
        mcp_payload = await asyncio.wait_for(
            get_mcp_health(timeout_seconds=timeout_seconds),
            timeout=timeout_seconds + 0.1,
        )
        mcp_status = str(mcp_payload.get("status") or "unknown")
        return {
            "status": "ok" if mcp_status == "ok" else "degraded",
            "service": mcp_payload.get("service", "nexushub-mcp-server"),
            "mode": mcp_payload.get("mode"),
            "transport": mcp_payload.get("transport"),
            "tools": mcp_payload.get("tools"),
        }
    except asyncio.TimeoutError:
        return {
            "status": "warming",
            "service": "nexushub-mcp-server",
            "error": {
                "code": "mcp_warming",
                "message": "MCP health did not respond before the warm-up timeout.",
            },
        }
    except Exception as exc:
        return {
            "status": "unreachable",
            "service": "nexushub-mcp-server",
            "error": {
                "code": "mcp_unreachable",
                "message": str(exc),
            },
        }


async def _microsoft_dependency_status(*, user_id: str | None) -> dict[str, Any]:
    microsoft = {"status": "unknown", "service": "microsoft-graph"}
    if user_id:
        try:
            status = MicrosoftConnectionService().get_status(user_id=user_id)
            if status.get("connected"):
                await get_valid_microsoft_access_token(user_id=user_id, workspace_id=None)
            microsoft = {
                "status": "connected" if status.get("connected") else "disconnected",
                "service": "microsoft-graph",
                "email": status.get("email"),
            }
        except AuthenticationRequiredError as exc:
            microsoft = {
                "status": "disconnected",
                "service": "microsoft-graph",
                "error": {"code": exc.code, "message": exc.message},
            }
        except Exception as exc:
            microsoft = {
                "status": "error",
                "service": "microsoft-graph",
                "error": {"code": "microsoft_status_error", "message": str(exc)},
            }
    return microsoft


def _not_checked(service: str) -> dict[str, Any]:
    return {
        "status": "not_checked",
        "service": service,
    }
