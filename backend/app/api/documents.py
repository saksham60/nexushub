from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.errors import (
    DocumentParsingError,
    LLMUnavailableError,
    NexusHubError,
    UnsupportedDocumentError,
)
from app.core.security import verify_internal_service_token
from app.models.schemas import DocumentAnalyzeRequest, DocumentReportRequest
from app.services.document_service import DocumentService

router = APIRouter(prefix="/api/documents", tags=["documents"])
internal_router = APIRouter(
    prefix="/internal/documents",
    tags=["internal-documents"],
    dependencies=[Depends(verify_internal_service_token)],
)


@router.post("/uploads")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str | None = Form(default=None),
    workspace_id: str | None = Form(default=None),
) -> dict[str, Any]:
    del workspace_id
    try:
        return await DocumentService().upload(file=file, user_id=user_id)
    except NexusHubError as exc:
        raise _http_error(exc) from exc


@router.post("/analyze")
async def analyze_document(payload: DocumentAnalyzeRequest) -> dict[str, Any]:
    try:
        return await DocumentService().analyze(
            document_id=payload.documentId,
            analysis_type=payload.analysisType,
            instructions=payload.instructions,
        )
    except NexusHubError as exc:
        raise _http_error(exc) from exc


@router.post("/reports")
async def create_report(payload: DocumentReportRequest) -> dict[str, Any]:
    try:
        return await DocumentService().report(
            document_id=payload.documentId,
            report_title=payload.reportTitle,
            instructions=payload.instructions,
            report_format=payload.format,
        )
    except NexusHubError as exc:
        raise _http_error(exc) from exc


@internal_router.post("/analyze")
async def internal_analyze_document(payload: DocumentAnalyzeRequest) -> dict[str, Any]:
    return await analyze_document(payload)


@internal_router.post("/reports")
async def internal_create_report(payload: DocumentReportRequest) -> dict[str, Any]:
    return await create_report(payload)


def _http_error(exc: NexusHubError) -> HTTPException:
    status_code = 400
    if isinstance(exc, UnsupportedDocumentError):
        status_code = 415
    elif isinstance(exc, DocumentParsingError):
        status_code = 422
    elif isinstance(exc, LLMUnavailableError):
        status_code = 503
    return HTTPException(
        status_code=status_code,
        detail={"code": exc.code, "message": exc.message},
    )
