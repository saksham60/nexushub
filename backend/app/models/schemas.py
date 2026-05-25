from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class UserWorkspaceRequest(BaseModel):
    user_id: str
    workspace_id: str | None = None


class RecentMailRequest(UserWorkspaceRequest):
    top: int = Field(default=10, ge=1, le=50)


class RecentFilesRequest(UserWorkspaceRequest):
    top: int = Field(default=10, ge=1, le=50)


class ApprovalCreateRequest(BaseModel):
    user_id: str
    workspace_id: str | None = None
    tool_name: str
    action_type: str
    payload: dict[str, Any]
    preview: dict[str, Any]


class ApprovalExecuteRequest(BaseModel):
    user_id: str
    approval_id: str
    approved: bool


class ApprovalListRequest(BaseModel):
    user_id: str
    workspace_id: str | None = None
    max_results: int = Field(default=10, ge=1, le=50)


class AgentChatRequest(BaseModel):
    user_id: str
    workspace_id: str | None = None
    message: str


class MailDraftPreviewRequest(UserWorkspaceRequest):
    original_message_id: str | None = None
    subject: str
    recipients: list[str] = Field(default_factory=list)
    context: str
    tone: str = "professional"
    intent: str | None = None


class MailDraftCreateRequest(UserWorkspaceRequest):
    original_message_id: str | None = Field(default=None, alias="originalMessageId")
    draft_body: str = Field(alias="draftBody")
    subject: str
    recipients: list[str] = Field(default_factory=list)
    mailbox_email: str | None = Field(default=None, alias="mailboxEmail")
    approval_id: str | None = Field(default=None, alias="approvalId")
    simulate: bool = False

    model_config = ConfigDict(populate_by_name=True)


class MailDraftReplyRequest(UserWorkspaceRequest):
    messageId: str
    subject: str
    from_email: str = Field(alias="from")
    to: list[str] = Field(default_factory=list)
    bodyPreview: str = ""
    body: str = ""
    mailboxEmail: str = ""
    tone: str = "professional"
    userIntent: str = "draft a concise executive reply"

    model_config = ConfigDict(populate_by_name=True)


class DocumentAnalyzeRequest(BaseModel):
    documentId: str
    analysisType: str = "executive_brief"
    instructions: str = ""


class DocumentReportRequest(BaseModel):
    documentId: str
    reportTitle: str
    instructions: str = ""
    format: str = "executive_summary"
