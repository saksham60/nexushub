from __future__ import annotations

from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:3001"
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_tenant_id: str = "common"
    microsoft_redirect_uri: str = "http://localhost:3001/auth/microsoft/callback"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""
    token_encryption_key: str = ""
    internal_service_token: str = ""
    mcp_server_url: str = "http://mcp-server:8010/mcp"
    mcp_simple_tool_url: str = "http://mcp-server:8010"
    agent_mode: str = "semantic"
    llm_provider: str = "openai"
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1"
    openai_base_url: str = "https://api.openai.com/v1"
    document_upload_dir: str = "uploads/documents"
    document_max_upload_bytes: int = 10 * 1024 * 1024
    log_level: str = "info"

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    load_dotenv()
    return Settings()
