from __future__ import annotations

from typing import Any, Literal

Source = Literal["mock", "microsoft_graph"]


def ok(source: Source, data: dict[str, Any], warnings: list[str] | None = None) -> dict[str, Any]:
    response: dict[str, Any] = {"ok": True, "source": source, "data": data}
    if warnings:
        response["warnings"] = warnings
    return response


def error(code: str, message: str, suggestion: str, source: Source | None = None) -> dict[str, Any]:
    response: dict[str, Any] = {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
            "suggestion": suggestion,
        },
    }
    if source:
        response["source"] = source
    return response


def graph_token_missing() -> dict[str, Any]:
    return error(
        code="authentication_required",
        message="Microsoft 365 is not connected for this user.",
        suggestion="Connect Microsoft through the NexusHub backend at /auth/microsoft/start.",
        source="microsoft_graph",
    )


def approval_required(
    source: Source,
    *,
    action_type: str,
    title: str,
    preview: str,
    payload: dict[str, Any],
    approval_id: str,
) -> dict[str, Any]:
    return ok(
        source,
        {
            "status": "approval_required",
            "actionType": action_type,
            "title": title,
            "preview": preview,
            "payload": payload,
            "approvalId": approval_id,
        },
    )
