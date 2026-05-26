from __future__ import annotations

import json
from typing import Any

import httpx
from langsmith import traceable

from app.config import Settings, get_settings
from app.core.errors import ConfigurationError, GraphServiceError


class OpenAILLMService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    @traceable(run_type="llm")
    async def complete_text(self, *, system_prompt: str, user_prompt: str) -> str:
        api_key = self._settings.openai_api_key
        model = self._settings.openai_model
        if not api_key or not model:
            raise ConfigurationError(
                "OpenAI LLM is not configured. Set OPENAI_API_KEY and OPENAI_MODEL."
            )

        payload = {
            "model": model,
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": system_prompt}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": user_prompt}],
                },
            ],
            "temperature": 0,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self._responses_url(), json=payload, headers=headers
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("OpenAI LLM endpoint is unreachable.") from exc

        if response.status_code >= 400:
            raise GraphServiceError(self._safe_error_message(response))

        data = response.json()
        output_text = self._extract_output_text(data)
        if not output_text:
            raise GraphServiceError("OpenAI returned an empty LLM response.")
        return output_text

    async def complete_json(
        self, *, system_prompt: str, user_prompt: str
    ) -> dict[str, Any]:
        text = await self.complete_text(
            system_prompt=system_prompt, user_prompt=user_prompt
        )
        return self._parse_json(text)

    def _responses_url(self) -> str:
        return f"{self._settings.openai_base_url.rstrip('/')}/responses"

    def _extract_output_text(self, payload: dict[str, Any]) -> str:
        output_text = payload.get("output_text")
        if isinstance(output_text, str):
            return output_text.strip()

        texts: list[str] = []
        for item in payload.get("output") or []:
            if not isinstance(item, dict):
                continue
            for content in item.get("content") or []:
                if not isinstance(content, dict):
                    continue
                text = content.get("text")
                if isinstance(text, str):
                    texts.append(text)

        choices = payload.get("choices") or []
        for choice in choices:
            if not isinstance(choice, dict):
                continue
            message = choice.get("message") or {}
            content = message.get("content")
            if isinstance(content, str):
                texts.append(content)

        return "\n".join(texts).strip()

    def _parse_json(self, text: str) -> dict[str, Any]:
        stripped = text.strip()
        if stripped.startswith("```"):
            stripped = stripped.strip("`").strip()
            if stripped.lower().startswith("json"):
                stripped = stripped[4:].strip()
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start != -1 and end != -1 and end > start:
            stripped = stripped[start : end + 1]
        parsed = json.loads(stripped)
        if not isinstance(parsed, dict):
            raise ValueError("LLM JSON response must be an object.")
        return parsed

    def _safe_error_message(self, response: httpx.Response) -> str:
        message = f"OpenAI LLM request failed with status {response.status_code}."
        try:
            payload = response.json()
        except ValueError:
            return message

        error = payload.get("error") if isinstance(payload, dict) else None
        if isinstance(error, dict):
            code = error.get("code")
            detail = error.get("message")
            parts = [str(part) for part in [code, detail] if part]
            if parts:
                return f"{message} {' - '.join(parts)}"
        return message
