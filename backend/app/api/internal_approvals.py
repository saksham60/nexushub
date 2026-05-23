from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.errors import NexusHubError
from app.core.security import verify_internal_service_token
from app.models.schemas import (
    ApprovalCreateRequest,
    ApprovalExecuteRequest,
    ApprovalListRequest,
)
from app.services.approval_service import ApprovalService

router = APIRouter(
    prefix="/internal/approvals", dependencies=[Depends(verify_internal_service_token)]
)


@router.post("/create")
async def create(payload: ApprovalCreateRequest) -> dict[str, object]:
    try:
        return {"data": ApprovalService().create_approval(**payload.model_dump())}
    except NexusHubError as exc:
        raise HTTPException(
            status_code=400, detail={"code": exc.code, "message": exc.message}
        ) from exc


@router.post("/execute")
async def execute(payload: ApprovalExecuteRequest) -> dict[str, object]:
    try:
        return {"data": ApprovalService().execute_approval(**payload.model_dump())}
    except NexusHubError as exc:
        raise HTTPException(
            status_code=400, detail={"code": exc.code, "message": exc.message}
        ) from exc


@router.post("/list")
async def list_pending(payload: ApprovalListRequest) -> dict[str, object]:
    try:
        return {"data": ApprovalService().list_pending(**payload.model_dump())}
    except NexusHubError as exc:
        raise HTTPException(
            status_code=400, detail={"code": exc.code, "message": exc.message}
        ) from exc
