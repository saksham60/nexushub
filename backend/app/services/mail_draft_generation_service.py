from __future__ import annotations

from typing import Any

from app.core.errors import (
    InsufficientEmailContextError,
    LLMUnavailableError,
)
from app.services.openai_llm_service import OpenAILLMService


class MailDraftGenerationService:
    def __init__(self, llm: OpenAILLMService | None = None) -> None:
        self._llm = llm or OpenAILLMService()

    async def generate(self, payload: dict[str, Any]) -> dict[str, Any]:
        subject = str(payload.get("subject") or "").strip()
        body_preview = str(payload.get("bodyPreview") or "").strip()
        body = str(payload.get("body") or "").strip()
        sender = str(payload.get("from") or payload.get("from_email") or "").strip()

        if not subject and not body_preview and not body:
            raise InsufficientEmailContextError(
                "Email subject and body context are missing, so a safe draft cannot be generated."
            )

        try:
            result = await self._llm.complete_json(
                system_prompt=_system_prompt(),
                user_prompt=_user_prompt({**payload, "from": sender}),
            )
        except (InsufficientEmailContextError, LLMUnavailableError):
            raise
        except Exception as exc:
            raise LLMUnavailableError("Could not generate draft because the LLM is unavailable.") from exc

        draft_body = str(result.get("draftBody") or "").strip()
        if not draft_body:
            raise LLMUnavailableError("The LLM returned an empty draft body.")

        draft_subject = str(result.get("draftSubject") or "").strip()
        if not draft_subject:
            draft_subject = subject if subject.lower().startswith("re:") else f"Re: {subject}"

        rationale = str(result.get("rationale") or "Draft is based on the supplied email context.").strip()
        confidence = _confidence(result.get("confidence"))

        return {
            "draftSubject": draft_subject,
            "draftBody": draft_body,
            "rationale": rationale,
            "confidence": confidence,
            "requiresApproval": True,
        }


def _system_prompt() -> str:
    return """You are NexusHub's executive email drafting assistant.
Return strict JSON only with keys: draftSubject, draftBody, rationale, confidence, requiresApproval.

Rules:
- Write like a concise business executive.
- Do not invent facts.
- Use only the provided email context.
- If context is insufficient, produce a cautious draft that asks for the missing clarification.
- Keep tone professional, direct, and helpful.
- Avoid overly generic phrases.
- Do not say "as an AI".
- Do not include fake commitments, dates, attachments, approvals, or deadlines unless present in source context.
- Never claim the email has been sent.
- requiresApproval must be true."""


def _user_prompt(payload: dict[str, Any]) -> str:
    return f"""Mailbox: {payload.get("mailboxEmail") or "unknown"}
Original message id: {payload.get("messageId") or "unknown"}
From: {payload.get("from") or "unknown"}
To: {", ".join(payload.get("to") or []) or "unknown"}
Subject: {payload.get("subject") or "(No subject)"}
Tone: {payload.get("tone") or "professional"}
User intent: {payload.get("userIntent") or "draft a concise executive reply"}

Body preview:
{payload.get("bodyPreview") or ""}

Full body/context:
{payload.get("body") or ""}"""


def _confidence(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.5
    return max(0.0, min(parsed, 1.0))
