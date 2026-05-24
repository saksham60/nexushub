from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.errors import ConfigurationError
from app.core.encryption import encrypt_secret
from app.db.supabase_client import get_supabase


class MicrosoftConnectionService:
    def save_connection(
        self,
        *,
        user_id: str | None,
        workspace_id: str | None,
        profile: dict[str, Any],
        token_response: dict[str, Any],
    ) -> str:
        email = profile.get("mail") or profile.get("userPrincipalName")
        display_name = profile.get("displayName")
        final_user_id = user_id or self._upsert_user(
            email=email, display_name=display_name
        )
        expires_at = datetime.now(UTC) + timedelta(
            seconds=int(token_response.get("expires_in") or 3600)
        )
        existing = (
            get_supabase()
            .table("oauth_connections")
            .select("id,refresh_token_encrypted")
            .eq("user_id", final_user_id)
            .eq("provider", "microsoft")
            .limit(1)
            .execute()
        )
        rows = existing.data or []
        refresh_token = token_response.get("refresh_token")
        if refresh_token:
            refresh_token_encrypted = encrypt_secret(str(refresh_token))
        elif rows and rows[0].get("refresh_token_encrypted"):
            refresh_token_encrypted = str(rows[0]["refresh_token_encrypted"])
        else:
            raise ConfigurationError(
                "Microsoft did not return a refresh token. Reconnect and consent to offline_access."
            )
        record = {
            "user_id": final_user_id,
            "workspace_id": workspace_id,
            "provider": "microsoft",
            "provider_account_id": profile.get("id"),
            "provider_email": email,
            "display_name": display_name,
            "scopes": str(token_response.get("scope") or "").split(),
            "access_token_encrypted": encrypt_secret(
                str(token_response["access_token"])
            ),
            "refresh_token_encrypted": refresh_token_encrypted,
            "expires_at": expires_at.isoformat(),
            "status": "connected",
            "updated_at": datetime.now(UTC).isoformat(),
        }
        if rows:
            get_supabase().table("oauth_connections").update(record).eq(
                "id", rows[0]["id"]
            ).execute()
        else:
            get_supabase().table("oauth_connections").insert(record).execute()
        return str(final_user_id)

    def get_status(self, *, user_id: str) -> dict[str, Any]:
        response = (
            get_supabase()
            .table("oauth_connections")
            .select("provider,provider_email,display_name,scopes,status")
            .eq("user_id", user_id)
            .eq("provider", "microsoft")
            .eq("status", "connected")
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return {
                "connected": False,
                "provider": "microsoft",
                "connect_url": "/auth/microsoft/start",
            }
        row = rows[0]
        return {
            "connected": True,
            "provider": "microsoft",
            "display_name": row.get("display_name"),
            "email": row.get("provider_email"),
            "scopes": row.get("scopes") or [],
        }

    def disconnect(self, *, user_id: str) -> dict[str, Any]:
        get_supabase().table("oauth_connections").update(
            {"status": "disconnected", "updated_at": datetime.now(UTC).isoformat()}
        ).eq("user_id", user_id).eq("provider", "microsoft").execute()
        return {"connected": False, "provider": "microsoft"}

    def _upsert_user(self, *, email: str | None, display_name: str | None) -> str:
        if not email:
            raise ValueError("Microsoft profile did not include an email.")
        existing = (
            get_supabase()
            .table("users")
            .select("id")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if existing.data:
            user_id = existing.data[0]["id"]
            get_supabase().table("users").update({"display_name": display_name}).eq(
                "id", user_id
            ).execute()
            return str(user_id)
        created = (
            get_supabase()
            .table("users")
            .insert({"email": email, "display_name": display_name})
            .execute()
        )
        return str(created.data[0]["id"])
