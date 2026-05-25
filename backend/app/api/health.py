from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from app.config import get_settings
from app.core.errors import AuthenticationRequiredError
from app.services.mcp_client import get_mcp_health
from app.services.microsoft_connection_service import MicrosoftConnectionService
from app.services.microsoft_token_service import get_valid_microsoft_access_token

router = APIRouter()


@router.get("/health")
async def health(user_id: str | None = Query(default=None)) -> dict[str, Any]:
    settings = get_settings()
    mcp: dict[str, Any]
    overall_status = "ok"

    try:
        mcp_payload = await get_mcp_health()
        mcp_status = str(mcp_payload.get("status") or "unknown")
        mcp = {
            "status": "ok" if mcp_status == "ok" else "degraded",
            "service": mcp_payload.get("service", "nexushub-mcp-server"),
            "mode": mcp_payload.get("mode"),
            "transport": mcp_payload.get("transport"),
            "tools": mcp_payload.get("tools"),
        }
        if mcp["status"] != "ok":
            overall_status = "degraded"
    except Exception as exc:
        overall_status = "degraded"
        mcp = {
            "status": "unreachable",
            "service": "nexushub-mcp-server",
            "error": {
                "code": "mcp_unreachable",
                "message": str(exc),
            },
        }

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
            overall_status = "degraded"
            microsoft = {
                "status": "disconnected",
                "service": "microsoft-graph",
                "error": {"code": exc.code, "message": exc.message},
            }
        except Exception as exc:
            overall_status = "degraded"
            microsoft = {
                "status": "error",
                "service": "microsoft-graph",
                "error": {"code": "microsoft_status_error", "message": str(exc)},
            }

    return {
        "status": overall_status,
        "service": "nexushub-backend",
        "backend": {
            "status": "ok",
            "service": "nexushub-backend",
            "url": settings.backend_url,
        },
        "dependencies": {
            "mcp": mcp,
            "microsoft": microsoft,
        },
    }
