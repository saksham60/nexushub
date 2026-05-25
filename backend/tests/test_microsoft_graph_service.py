from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.services.microsoft_graph_service import (
    MicrosoftGraphService,
    _graph_error_message,
    _graph_path_segment,
    _should_fallback_to_standalone_draft,
)


class FakeGraphClient:
    def __init__(self) -> None:
        self.posts: list[tuple[str, dict[str, object]]] = []

    async def __aenter__(self) -> "FakeGraphClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, path: str, **kwargs: object) -> httpx.Response:
        self.posts.append((path, kwargs))
        if path.endswith("/createReply"):
            return httpx.Response(
                400,
                json={
                    "error": {
                        "code": "ErrorInvalidRequest",
                        "message": "Cannot create a reply for this message.",
                    }
                },
                request=httpx.Request(
                    "POST", f"https://graph.microsoft.com/v1.0{path}"
                ),
            )
        return httpx.Response(
            201,
            json={
                "id": "fallback-draft-1",
                "webLink": "https://outlook.office.com/mail/draft",
                "createdDateTime": "2026-05-25T12:00:00Z",
            },
            request=httpx.Request("POST", "https://graph.microsoft.com/v1.0/me/messages"),
        )


class MicrosoftGraphServiceTests(unittest.TestCase):
    def test_graph_path_segment_encodes_message_ids(self) -> None:
        self.assertEqual(_graph_path_segment("a/b+c="), "a%2Fb%2Bc%3D")

    def test_create_reply_400_falls_back_to_standalone_draft(self) -> None:
        async def run_test() -> None:
            fake_client = FakeGraphClient()

            with (
                patch(
                    "app.services.microsoft_graph_service.get_valid_microsoft_access_token",
                    new=AsyncMock(return_value="token"),
                ),
                patch(
                    "app.services.microsoft_graph_service.httpx.AsyncClient",
                    return_value=fake_client,
                ),
            ):
                result = await MicrosoftGraphService().create_draft_reply(
                    user_id="user-1",
                    workspace_id=None,
                    original_message_id="message/1=",
                    subject="Re: Hello",
                    recipients=["recipient@example.com"],
                    body="Thanks for reaching out.",
                )

            self.assertEqual(result["id"], "fallback-draft-1")
            self.assertEqual(result["createdVia"], "standalone_draft")
            self.assertEqual(
                result["replyFallbackReason"],
                "ErrorInvalidRequest: Cannot create a reply for this message.",
            )
            self.assertEqual(
                [path for path, _ in fake_client.posts],
                ["/me/messages/message%2F1%3D/createReply", "/me/messages"],
            )

        import asyncio

        asyncio.run(run_test())

    def test_only_400_and_404_create_reply_errors_use_draft_fallback(self) -> None:
        self.assertTrue(_should_fallback_to_standalone_draft(httpx.Response(400)))
        self.assertTrue(_should_fallback_to_standalone_draft(httpx.Response(404)))
        self.assertFalse(_should_fallback_to_standalone_draft(httpx.Response(403)))
        self.assertFalse(_should_fallback_to_standalone_draft(httpx.Response(500)))

    def test_graph_error_message_extracts_graph_payload_message(self) -> None:
        response = httpx.Response(
            400,
            json={"error": {"code": "ErrorItemNotFound", "message": "The specified object was not found."}},
            request=httpx.Request(
                "POST", "https://graph.microsoft.com/v1.0/me/messages"
            ),
        )

        self.assertEqual(
            _graph_error_message(response, "fallback"),
            "ErrorItemNotFound: The specified object was not found.",
        )

    def test_graph_error_message_uses_fallback_for_non_json_response(self) -> None:
        response = httpx.Response(
            502,
            text="Bad Gateway",
            request=httpx.Request(
                "POST", "https://graph.microsoft.com/v1.0/me/messages"
            ),
        )

        self.assertEqual(_graph_error_message(response, "fallback"), "fallback")


if __name__ == "__main__":
    unittest.main()
