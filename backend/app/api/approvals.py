from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.core.errors import NexusHubError
from app.services.approval_service import ApprovalService

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("")
async def list_pending(
    user_id: str = Query(...), workspace_id: str | None = None
) -> dict[str, object]:
    try:
        return ApprovalService().list_pending(
            user_id=user_id, workspace_id=workspace_id
        )
    except NexusHubError as exc:
        raise HTTPException(
            status_code=400, detail={"code": exc.code, "message": exc.message}
        ) from exc


@router.post("/{approval_id}/approve")
async def approve(approval_id: str, user_id: str = Query(...)) -> dict[str, object]:
    try:
        return ApprovalService().execute_approval(
            user_id=user_id, approval_id=approval_id, approved=True
        )
    except NexusHubError as exc:
        raise HTTPException(
            status_code=400, detail={"code": exc.code, "message": exc.message}
        ) from exc


@router.post("/{approval_id}/reject")
async def reject(approval_id: str, user_id: str = Query(...)) -> dict[str, object]:
    try:
        return ApprovalService().execute_approval(
            user_id=user_id, approval_id=approval_id, approved=False
        )
    except NexusHubError as exc:
        raise HTTPException(
            status_code=400, detail={"code": exc.code, "message": exc.message}
        ) from exc
