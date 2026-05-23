from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

NexusHubMode = Literal["mock", "graph"]
McpTransport = Literal["stdio", "streamable-http", "sse"]


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _normalize_mode(value: str | None) -> NexusHubMode:
    normalized = (value or "mock").strip().lower()
    if normalized in {"mock", "graph"}:
        return normalized  # type: ignore[return-value]
    raise ValueError(f"Unsupported NEXUSHUB_MODE={value!r}. Use mock or graph.")


def _normalize_transport(value: str | None) -> McpTransport:
    normalized = (value or "stdio").strip().lower().replace("_", "-")
    if normalized in {"http", "streamable-http"}:
        return "streamable-http"
    if normalized in {"stdio", "sse"}:
        return normalized  # type: ignore[return-value]
    raise ValueError(f"Unsupported MCP_TRANSPORT={value!r}. Use stdio, streamable-http, or sse.")


def _int_from_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return int(raw)


@dataclass(frozen=True, slots=True)
class Settings:
    mode: NexusHubMode
    transport: McpTransport
    host: str
    port: int
    http_path: str
    log_level: str
    project_root: Path
    local_upload_dir: Path
    important_sender_keywords: tuple[str, ...]
    allowed_origins: tuple[str, ...]
    backend_internal_url: str
    internal_service_token: str | None

    @property
    def source(self) -> Literal["mock", "microsoft_graph"]:
        return "mock" if self.mode == "mock" else "microsoft_graph"

    @classmethod
    def from_env(cls) -> Settings:
        load_dotenv()
        project_root = Path(os.getenv("NEXUSHUB_PROJECT_ROOT", Path.cwd())).resolve()
        upload_dir_raw = Path(os.getenv("NEXUSHUB_LOCAL_UPLOAD_DIR", "uploads"))
        upload_dir = (
            upload_dir_raw if upload_dir_raw.is_absolute() else project_root / upload_dir_raw
        )
        http_path = os.getenv("MCP_HTTP_PATH", "/mcp").strip() or "/mcp"
        if not http_path.startswith("/"):
            http_path = f"/{http_path}"

        log_level = (os.getenv("LOG_LEVEL", "warning") or "warning").upper()
        if log_level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            log_level = "WARNING"

        return cls(
            mode=_normalize_mode(os.getenv("NEXUSHUB_MODE")),
            transport=_normalize_transport(os.getenv("MCP_TRANSPORT")),
            host=os.getenv("MCP_HOST", "0.0.0.0"),
            port=_int_from_env("MCP_PORT", _int_from_env("PORT", 8010)),
            http_path=http_path,
            log_level=log_level,
            project_root=project_root,
            local_upload_dir=upload_dir.resolve(),
            important_sender_keywords=tuple(
                item.lower()
                for item in _split_csv(
                    os.getenv(
                        "NEXUSHUB_IMPORTANT_SENDERS",
                        "please,can you,approve,review,urgent,need your input,waiting for your response",
                    )
                )
            ),
            allowed_origins=tuple(_split_csv(os.getenv("NEXUSHUB_ALLOWED_ORIGINS"))),
            backend_internal_url=(
                os.getenv("BACKEND_INTERNAL_URL", "http://localhost:3001").rstrip("/")
            ),
            internal_service_token=os.getenv("INTERNAL_SERVICE_TOKEN") or None,
        )
