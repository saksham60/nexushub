from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import Settings, get_settings
from app.core.errors import ConfigurationError, ForbiddenError, GraphServiceError

MICROSOFT_SCOPES = (
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "Calendars.Read",
    "Calendars.ReadWrite",
    "Files.Read.All",
)

STATE_TTL_SECONDS = 600
_states: dict[str, dict[str, Any]] = {}


@dataclass(slots=True)
class OAuthState:
    state: str
    user_id: str | None
    workspace_id: str | None


class MicrosoftOAuthService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def create_authorization_url(
        self, *, user_id: str | None = None, workspace_id: str | None = None
    ) -> str:
        if not self._settings.microsoft_client_id:
            raise ConfigurationError("MICROSOFT_CLIENT_ID is not configured.")
        state = secrets.token_urlsafe(32)
        _states[state] = {
            "expires_at": time.time() + STATE_TTL_SECONDS,
            "user_id": user_id,
            "workspace_id": workspace_id,
        }
        self._clear_expired_states()
        query = urlencode(
            {
                "client_id": self._settings.microsoft_client_id,
                "response_type": "code",
                "redirect_uri": self._settings.microsoft_redirect_uri,
                "response_mode": "query",
                "scope": " ".join(MICROSOFT_SCOPES),
                "state": state,
            }
        )
        return f"https://login.microsoftonline.com/{self._settings.microsoft_tenant_id}/oauth2/v2.0/authorize?{query}"

    def consume_state(self, state: str) -> OAuthState:
        record = _states.pop(state, None)
        if not record or float(record["expires_at"]) < time.time():
            raise ForbiddenError("Invalid or expired OAuth state.")
        return OAuthState(
            state=state,
            user_id=record.get("user_id"),
            workspace_id=record.get("workspace_id"),
        )

    async def exchange_code_for_tokens(self, code: str) -> dict[str, Any]:
        if (
            not self._settings.microsoft_client_id
            or not self._settings.microsoft_client_secret
        ):
            raise ConfigurationError(
                "Microsoft OAuth client credentials are not configured."
            )
        token_url = f"https://login.microsoftonline.com/{self._settings.microsoft_tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self._settings.microsoft_client_id,
            "client_secret": self._settings.microsoft_client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self._settings.microsoft_redirect_uri,
            "scope": " ".join(MICROSOFT_SCOPES),
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(token_url, data=data)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft token exchange failed.") from exc
        payload = response.json()
        if not isinstance(payload, dict) or not payload.get("access_token"):
            raise GraphServiceError("Microsoft token response was invalid.")
        return payload

    def _clear_expired_states(self) -> None:
        now = time.time()
        for state in [
            key for key, value in _states.items() if float(value["expires_at"]) < now
        ]:
            _states.pop(state, None)
