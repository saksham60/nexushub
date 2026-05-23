from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status

from app.config import Settings, get_settings


def verify_internal_service_token(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.internal_service_token
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "internal_service_token_missing",
                "message": "INTERNAL_SERVICE_TOKEN is not configured.",
            },
        )
    if request.headers.get("authorization") != f"Bearer {expected}":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "unauthorized",
                "message": "Invalid internal service token.",
            },
        )
