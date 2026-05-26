from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.errors import AuthenticationRequiredError, NexusHubError
from app.core.security import verify_internal_service_token
from app.models.schemas import (
    RecentFilesRequest,
    RecentMailRequest,
    UserWorkspaceRequest,
    CalendarScheduleOrchestrateRequest,
    CalendarRescheduleOrchestrateRequest,
)
from app.services.microsoft_graph_service import MicrosoftGraphService
from app.services.calendar_orchestration_service import CalendarOrchestrationService

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


@router.post("/calendar/orchestrate/schedule")
async def calendar_orchestrate_schedule(payload: CalendarScheduleOrchestrateRequest) -> dict[str, object]:
    try:
        return await CalendarOrchestrationService().prepare_schedule_approval(
            user_id=payload.user_id,
            workspace_id=payload.workspace_id,
            subject=payload.subject,
            start_time=payload.start_time,
            end_time=payload.end_time,
            attendees=payload.attendees,
            timezone=payload.timezone,
        )
    except NexusHubError as exc:
        raise _handle_error(exc) from exc


@router.post("/calendar/orchestrate/reschedule")
async def calendar_orchestrate_reschedule(payload: CalendarRescheduleOrchestrateRequest) -> dict[str, object]:
    try:
        return await CalendarOrchestrationService().prepare_reschedule_approval(
            user_id=payload.user_id,
            workspace_id=payload.workspace_id,
            event_id=payload.event_id,
            meeting_title=payload.meeting_title,
            target_start_time=payload.target_start_time,
            target_end_time=payload.target_end_time,
            timezone=payload.timezone,
        )
    except NexusHubError as exc:
        raise _handle_error(exc) from exc
