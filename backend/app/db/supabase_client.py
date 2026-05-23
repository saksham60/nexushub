from __future__ import annotations

from typing import Any

from app.config import get_settings
from app.core.errors import ConfigurationError


def get_supabase() -> Any:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ConfigurationError("Supabase URL and service role key are required.")
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)
