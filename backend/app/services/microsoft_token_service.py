from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.config import Settings, get_settings
from app.core.encryption import decrypt_secret, encrypt_secret
from app.core.errors import (
    AuthenticationRequiredError,
    ConfigurationError,
    GraphServiceError,
)
from app.db.supabase_client import get_supabase
from app.services.microsoft_oauth_service import MICROSOFT_SCOPES


class MicrosoftTokenService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    async def get_valid_microsoft_access_token(
        self, user_id: str, workspace_id: str | None = None
    ) -> str:
        connection = self._load_connection(user_id, workspace_id)
        expires_at = _parse_datetime(connection.get("expires_at"))
        access_token = decrypt_secret(str(connection["access_token_encrypted"]))
        if expires_at and expires_at - datetime.now(UTC) > timedelta(minutes=5):
            return access_token
        return await self._refresh_connection(connection)

    def _load_connection(
        self, user_id: str, workspace_id: str | None
    ) -> dict[str, Any]:
        query = (
            get_supabase()
            .table("oauth_connections")
            .select("*")
            .eq("user_id", user_id)
            .eq("provider", "microsoft")
            .eq("status", "connected")
            .order("updated_at", desc=True)
            .limit(1)
        )
        if workspace_id:
            query = query.eq("workspace_id", workspace_id)
        response = query.execute()
        rows = response.data or []
        if not rows:
            raise AuthenticationRequiredError("Microsoft 365 is not connected.")
        return dict(rows[0])

    async def _refresh_connection(self, connection: dict[str, Any]) -> str:
        if (
            not self._settings.microsoft_client_id
            or not self._settings.microsoft_client_secret
        ):
            raise ConfigurationError(
                "Microsoft OAuth client credentials are not configured."
            )
        refresh_token = decrypt_secret(str(connection["refresh_token_encrypted"]))
        token_url = f"https://login.microsoftonline.com/{self._settings.microsoft_tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self._settings.microsoft_client_id,
            "client_secret": self._settings.microsoft_client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "scope": " ".join(MICROSOFT_SCOPES),
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(token_url, data=data)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AuthenticationRequiredError(
                "Microsoft 365 needs to be reconnected."
            ) from exc
        payload = response.json()
        if not isinstance(payload, dict) or not payload.get("access_token"):
            raise GraphServiceError("Microsoft token refresh response was invalid.")
        new_refresh_token = str(payload.get("refresh_token") or refresh_token)
        expires_at = datetime.now(UTC) + timedelta(
            seconds=int(payload.get("expires_in") or 3600)
        )
        get_supabase().table("oauth_connections").update(
            {
                "access_token_encrypted": encrypt_secret(str(payload["access_token"])),
                "refresh_token_encrypted": encrypt_secret(new_refresh_token),
                "expires_at": expires_at.isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", connection["id"]).execute()
        return str(payload["access_token"])


async def get_valid_microsoft_access_token(
    user_id: str, workspace_id: str | None = None
) -> str:
    return await MicrosoftTokenService().get_valid_microsoft_access_token(
        user_id, workspace_id
    )


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
