from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

from app.api.command_center import _safe_tool


class CommandCenterFeedTests(unittest.IsolatedAsyncioTestCase):
    async def test_auth_required_tool_response_is_microsoft_auth_error(self) -> None:
        with patch("app.api.command_center.call_tool", new=AsyncMock(return_value={
            "result": {
                "ok": False,
                "source": "microsoft_graph",
                "status": "authentication_required",
                "message": "Please connect Microsoft 365 first.",
            }
        })):
            source, payload, error, error_kind = await _safe_tool(
                "mail",
                "mail_find_needs_reply",
                {"user_id": "user-1"},
            )

        self.assertEqual(source, "mail")
        self.assertEqual(payload, {})
        self.assertEqual(error, "Please connect Microsoft 365 first.")
        self.assertEqual(error_kind, "auth")

    async def test_tool_transport_failure_is_mcp_error(self) -> None:
        with patch("app.api.command_center.call_tool", new=AsyncMock(side_effect=RuntimeError("boom"))):
            source, payload, error, error_kind = await _safe_tool(
                "calendar",
                "calendar_get_today_agenda",
                {"user_id": "user-1"},
            )

        self.assertEqual(source, "calendar")
        self.assertEqual(payload, {})
        self.assertEqual(error, "boom")
        self.assertEqual(error_kind, "mcp")


if __name__ == "__main__":
    unittest.main()
