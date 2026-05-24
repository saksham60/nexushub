from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.core.errors import (
    AuthenticationRequiredError,
    ConsentRequiredError,
    GraphServiceError,
    InsufficientEmailContextError,
    LLMUnavailableError,
    NexusHubError,
)
from app.core.security import verify_internal_service_token
from app.models.schemas import (
    MailDraftCreateRequest,
    MailDraftPreviewRequest,
    MailDraftReplyRequest,
)
from app.services.approval_service import ApprovalService
from app.services.mail_draft_generation_service import MailDraftGenerationService
from app.services.mcp_client import call_tool

router = APIRouter(prefix="/mail", tags=["mail"])
internal_router = APIRouter(
    prefix="/internal/mail", dependencies=[Depends(verify_internal_service_token)]
)


@router.post("/draft-reply", response_model=None)
async def draft_reply(payload: MailDraftReplyRequest):
    return await _generate_draft_reply(payload)


@internal_router.post("/draft-reply", response_model=None)
async def internal_draft_reply(payload: MailDraftReplyRequest):
    return await _generate_draft_reply(payload)


async def _generate_draft_reply(payload: MailDraftReplyRequest):
    try:
        return await MailDraftGenerationService().generate(
            {
                "messageId": payload.messageId,
                "subject": payload.subject,
                "from": payload.from_email,
                "to": payload.to,
                "bodyPreview": payload.bodyPreview,
                "body": payload.body,
                "mailboxEmail": payload.mailboxEmail,
                "tone": payload.tone,
                "userIntent": payload.userIntent,
            }
        )
    except InsufficientEmailContextError as exc:
        return _draft_error("INSUFFICIENT_EMAIL_CONTEXT", exc.message, 400)
    except LLMUnavailableError as exc:
        return _draft_error("LLM_UNAVAILABLE", exc.message, 503)
    except NexusHubError as exc:
        return _draft_error("UNKNOWN_ERROR", exc.message, 500)
    except Exception:
        return _draft_error("UNKNOWN_ERROR", "Could not generate draft. Please try again.", 500)


@router.post("/drafts/preview")
async def preview_draft(payload: MailDraftPreviewRequest) -> dict[str, Any]:
    try:
        result = await call_tool(
            "mail_create_draft_reply",
            {
                "user_id": payload.user_id,
                "workspace_id": payload.workspace_id,
                "to": payload.recipients,
                "subject": payload.subject,
                "context": payload.context,
                "tone": payload.tone,
                "intent": payload.intent,
                "originalMessageId": payload.original_message_id,
            },
        )
        tool_result = result.get("result") or result
        if not isinstance(tool_result, dict):
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "invalid_mcp_response",
                    "message": "MCP returned an invalid draft preview response.",
                },
            )
        if tool_result.get("status") == "authentication_required":
            raise HTTPException(
                status_code=401,
                detail={
                    "code": "authentication_required",
                    "message": tool_result.get("message", "Please connect Microsoft 365 first."),
                },
            )
        if tool_result.get("ok") is False:
            error = tool_result.get("error") or {}
            raise HTTPException(
                status_code=400,
                detail={
                    "code": error.get("code", "draft_preview_failed"),
                    "message": error.get("message", "Draft preview failed."),
                },
            )
        data = tool_result.get("data") or tool_result
        if data.get("status") != "approval_required":
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "draft_preview_not_created",
                    "message": "MCP did not create an approval-gated draft preview.",
                },
            )
        return {
            "status": "approval_required",
            "approvalId": data.get("approvalId"),
            "draftBody": data.get("preview"),
            "subject": data.get("payload", {}).get("subject") or payload.subject,
            "recipients": data.get("payload", {}).get("to") or payload.recipients,
            "originalMessageId": data.get("payload", {}).get("originalMessageId")
            or payload.original_message_id,
            "source": tool_result.get("source"),
        }
    except NexusHubError as exc:
        raise _http_error(exc) from exc


@router.post("/drafts")
async def create_draft(payload: MailDraftCreateRequest) -> dict[str, Any]:
    if not payload.approval_id:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "approval_required",
                "message": "approval_id is required to create an Outlook draft.",
            },
        )

    try:
        result = await ApprovalService().create_mail_draft_from_approval(
            user_id=payload.user_id,
            workspace_id=payload.workspace_id,
            approval_id=payload.approval_id,
            draft_body=payload.draft_body,
            subject=payload.subject,
            recipients=payload.recipients,
            original_message_id=payload.original_message_id,
            simulate=payload.simulate,
        )
    except NexusHubError as exc:
        raise _http_error(exc) from exc

    draft = result.get("draft") or {}
    return {
        "success": bool(draft.get("success")),
        "outlookDraftId": draft.get("outlookDraftId"),
        "mailboxEmail": draft.get("mailboxEmail"),
        "createdAt": draft.get("createdAt"),
        "webLink": draft.get("webLink"),
        "simulated": bool(draft.get("simulated")),
        "approvalId": payload.approval_id,
    }


def _http_error(exc: NexusHubError) -> HTTPException:
    status_code = 400
    if isinstance(exc, AuthenticationRequiredError):
        status_code = 401
    elif isinstance(exc, ConsentRequiredError):
        status_code = 403
    elif isinstance(exc, GraphServiceError):
        status_code = 502
    return HTTPException(
        status_code=status_code,
        detail={"code": exc.code, "message": exc.message},
    )


def _draft_error(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        {"error": True, "code": code, "message": message},
        status_code=status_code,
    )
