from __future__ import annotations

import unittest

import httpx

from app.services.microsoft_graph_service import (
    _graph_error_message,
    _graph_path_segment,
)


class MicrosoftGraphServiceTests(unittest.TestCase):
    def test_graph_path_segment_encodes_message_ids(self) -> None:
        self.assertEqual(_graph_path_segment("a/b+c="), "a%2Fb%2Bc%3D")

    def test_graph_error_message_extracts_graph_payload_message(self) -> None:
        response = httpx.Response(
            400,
            json={"error": {"message": "The specified object was not found."}},
            request=httpx.Request(
                "POST", "https://graph.microsoft.com/v1.0/me/messages"
            ),
        )

        self.assertEqual(
            _graph_error_message(response, "fallback"),
            "The specified object was not found.",
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
