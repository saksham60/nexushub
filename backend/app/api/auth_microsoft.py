from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.core.errors import AuthenticationRequiredError, NexusHubError
from app.core.logging import get_logger
from app.services.microsoft_connection_service import MicrosoftConnectionService
from app.services.microsoft_graph_service import GRAPH_BASE_URL
from app.services.microsoft_oauth_service import MicrosoftOAuthService
from app.services.microsoft_token_service import get_valid_microsoft_access_token

import httpx

router = APIRouter(prefix="/auth/microsoft", tags=["auth"])
logger = get_logger(__name__)


def _connection_failed(stage: str, exc: Exception) -> HTTPException:
    logger.exception(
        "Microsoft OAuth callback failed.",
        extra={
            "metadata": {
                "stage": stage,
                "errorType": exc.__class__.__name__,
            }
        },
    )
    return HTTPException(
        status_code=400,
        detail={
            "code": "microsoft_connection_failed",
            "message": f"Microsoft connection failed during {stage}.",
            "stage": stage,
        },
    )


@router.get("/start")
async def start(
    user_id: str | None = None, workspace_id: str | None = None
) -> RedirectResponse:
    try:
        url = MicrosoftOAuthService().create_authorization_url(
            user_id=user_id, workspace_id=workspace_id
        )
    except NexusHubError as exc:
        raise HTTPException(
            status_code=500, detail={"code": exc.code, "message": exc.message}
        ) from exc
    return RedirectResponse(url)


@router.get("/callback")
async def callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
) -> RedirectResponse:
    settings = get_settings()
    if error:
        return RedirectResponse(
            f"{settings.frontend_url}/settings?provider=microsoft&status=error"
        )
    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail={"code": "invalid_callback", "message": "Missing code or state."},
        )
    oauth = MicrosoftOAuthService(settings)
    try:
        oauth_state = oauth.consume_state(state)
    except Exception as exc:
        raise _connection_failed("state_validation", exc) from exc

    try:
        tokens = await oauth.exchange_code_for_tokens(code)
    except Exception as exc:
        raise _connection_failed("token_exchange", exc) from exc

    try:
        async with httpx.AsyncClient(base_url=GRAPH_BASE_URL, timeout=20.0) as client:
            me_response = await client.get(
                "/me",
                params={"$select": "id,displayName,mail,userPrincipalName"},
                headers={
                    "Authorization": f"Bearer {tokens['access_token']}",
                    "Accept": "application/json",
                },
            )
            me_response.raise_for_status()
            profile = me_response.json()
    except Exception as exc:
        raise _connection_failed("graph_profile", exc) from exc

    try:
        user_id = MicrosoftConnectionService().save_connection(
            user_id=oauth_state.user_id,
            workspace_id=oauth_state.workspace_id,
            profile=profile,
            token_response=tokens,
        )
    except Exception as exc:
        raise _connection_failed("token_storage", exc) from exc
    return RedirectResponse(
        f"{settings.frontend_url}/settings?provider=microsoft&status=connected&user_id={user_id}"
    )


@router.get("/status")
async def status(user_id: str = Query(...)) -> dict[str, object]:
    microsoft_status = MicrosoftConnectionService().get_status(user_id=user_id)
    if not microsoft_status.get("connected"):
        return microsoft_status
    try:
        await get_valid_microsoft_access_token(user_id=user_id, workspace_id=None)
    except AuthenticationRequiredError as exc:
        return {
            "connected": False,
            "provider": "microsoft",
            "connect_url": "/auth/microsoft/start",
            "error": {"code": exc.code, "message": exc.message},
        }
    return microsoft_status


@router.post("/disconnect")
async def disconnect(user_id: str = Query(...)) -> dict[str, object]:
    return MicrosoftConnectionService().disconnect(user_id=user_id)
