from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.config import get_settings
from app.services.mcp_client import get_mcp_health

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, Any]:
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
        },
    }
