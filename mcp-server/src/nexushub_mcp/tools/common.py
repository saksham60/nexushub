from __future__ import annotations

from typing import Any


def authentication_required() -> dict[str, Any]:
    return {
        "ok": False,
        "source": "microsoft_graph",
        "status": "authentication_required",
        "provider": "microsoft",
        "connect_url": "/auth/microsoft/start",
        "message": "Please connect Microsoft 365 first.",
    }


def user_id_required() -> dict[str, Any]:
    return {
        "ok": False,
        "source": "microsoft_graph",
        "error": {
            "code": "user_id_required",
            "message": "Graph mode requires user_id.",
            "suggestion": "Call this tool through the backend agent or include user_id in arguments.",
        },
    }


def not_implemented(message: str) -> dict[str, Any]:
    return {
        "ok": False,
        "source": "microsoft_graph",
        "status": "not_implemented",
        "message": message,
    }


def ensure_user_id(mode: str, user_id: str | None) -> dict[str, Any] | None:
    if mode == "graph" and not user_id:
        return user_id_required()
    return None
