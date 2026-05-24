from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.errors import NexusHubError
from app.services.tool_catalog_service import ToolCatalogService

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("/catalog")
async def get_tool_catalog() -> dict[str, object]:
    try:
        return await ToolCatalogService().get_catalog()
    except NexusHubError as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "tool_catalog_unavailable",
                "message": "Could not load the MCP tool catalog.",
            },
        ) from exc
