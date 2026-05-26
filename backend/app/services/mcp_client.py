from __future__ import annotations

from typing import Any

import httpx
from langsmith import traceable

from app.config import Settings, get_settings
from app.core.errors import GraphServiceError


class McpClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    async def health(self) -> dict[str, Any]:
        url = f"{self._settings.mcp_simple_tool_url.rstrip('/')}/health"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
        except httpx.HTTPError as exc:
            raise GraphServiceError("MCP server is unreachable.") from exc
        if response.status_code >= 400:
            raise GraphServiceError(
                f"MCP health check failed with status {response.status_code}."
            )
        payload = response.json()
        return payload if isinstance(payload, dict) else {"status": "unknown"}

    @traceable(run_type="tool")
    async def call_tool(
        self, tool_name: str, arguments: dict[str, Any]
    ) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {self._settings.internal_service_token}"}
        url = f"{self._settings.mcp_simple_tool_url.rstrip('/')}/tools/{tool_name}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url, json={"arguments": arguments}, headers=headers
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("MCP server is unreachable.") from exc
        if response.status_code >= 400:
            raise GraphServiceError(
                f"MCP tool call failed with status {response.status_code}."
            )
        payload = response.json()
        return payload if isinstance(payload, dict) else {"result": payload}


async def call_tool(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    return await McpClient().call_tool(tool_name, arguments)


async def get_mcp_health() -> dict[str, Any]:
    return await McpClient().health()
