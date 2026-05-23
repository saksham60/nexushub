from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.errors import AuthenticationRequiredError, NexusHubError
from app.core.security import verify_internal_service_token
from app.models.schemas import (
    RecentFilesRequest,
    RecentMailRequest,
    UserWorkspaceRequest,
)
from app.services.microsoft_graph_service import MicrosoftGraphService

router = APIRouter(
    prefix="/internal/graph", dependencies=[Depends(verify_internal_service_token)]
)


def _handle_error(exc: NexusHubError) -> HTTPException:
    status = 401 if isinstance(exc, AuthenticationRequiredError) else 502
    return HTTPException(
        status_code=status, detail={"code": exc.code, "message": exc.message}
    )


@router.post("/me")
async def me(payload: UserWorkspaceRequest) -> dict[str, object]:
    try:
        return {
            "data": await MicrosoftGraphService().get_me(
                payload.user_id, payload.workspace_id
            )
        }
    except NexusHubError as exc:
        raise _handle_error(exc) from exc


@router.post("/mail/recent")
async def mail_recent(payload: RecentMailRequest) -> dict[str, object]:
    try:
        return {
            "data": await MicrosoftGraphService().get_recent_messages(
                payload.user_id, payload.workspace_id, payload.top
            )
        }
    except NexusHubError as exc:
        raise _handle_error(exc) from exc


@router.post("/calendar/today")
async def calendar_today(payload: UserWorkspaceRequest) -> dict[str, object]:
    try:
        return {
            "data": await MicrosoftGraphService().get_today_calendar(
                payload.user_id, payload.workspace_id
            )
        }
    except NexusHubError as exc:
        raise _handle_error(exc) from exc


@router.post("/files/recent")
async def files_recent(payload: RecentFilesRequest) -> dict[str, object]:
    try:
        return {
            "data": await MicrosoftGraphService().get_recent_files(
                payload.user_id, payload.workspace_id, payload.top
            )
        }
    except NexusHubError as exc:
        raise _handle_error(exc) from exc
