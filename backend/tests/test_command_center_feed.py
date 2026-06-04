from __future__ import annotations

import unittest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
from zoneinfo import ZoneInfo

from app.api.command_center import _safe_tool, feed


class CommandCenterFeedTests(unittest.IsolatedAsyncioTestCase):
    async def test_feed_does_not_probe_mcp_health(self) -> None:
        microsoft_connection = Mock()
        microsoft_connection.get_status.return_value = {
            "connected": True,
            "email": "user@example.com",
        }
        graph_service = Mock()
        graph_service.get_recent_teams_chats = AsyncMock(return_value={"value": []})
        graph_service.get_unread_messages = AsyncMock(return_value={"value": []})
        graph_service.get_calendar_range = AsyncMock(return_value={"value": []})

        with (
            patch("app.services.mcp_client.McpClient.health", new_callable=AsyncMock) as mcp_health,
            patch("app.api.command_center.MicrosoftConnectionService", return_value=microsoft_connection),
            patch("app.api.command_center.call_tool", new=AsyncMock(return_value={"result": {"ok": True}})),
            patch("app.api.command_center.ApprovalService") as approval_service_class,
            patch("app.api.command_center.MicrosoftGraphService", return_value=graph_service),
        ):
            approval_service_class.return_value.list_pending.return_value = {"items": []}
            response = await feed(user_id="user-1", workspace_id=None)

        mcp_health.assert_not_called()
        self.assertEqual(response["health"]["mcp"], "ok")
        self.assertEqual(response["errors"], {})
        self.assertEqual(response["counts"]["unreadEmail"], 0)

    async def test_feed_counts_unread_mail_separately_from_reply_needed(self) -> None:
        microsoft_connection = Mock()
        microsoft_connection.get_status.return_value = {
            "connected": True,
            "email": "user@example.com",
        }
        graph_service = Mock()
        graph_service.get_recent_teams_chats = AsyncMock(return_value={"value": []})
        graph_service.get_calendar_range = AsyncMock(return_value={"value": []})
        graph_service.get_unread_messages = AsyncMock(
            return_value={
                "value": [
                    {"id": "msg-1", "isRead": False},
                    {"id": "msg-2", "isRead": False},
                    {"id": "msg-3", "isRead": True},
                ]
            }
        )

        with (
            patch("app.api.command_center.MicrosoftConnectionService", return_value=microsoft_connection),
            patch("app.api.command_center.call_tool", new=AsyncMock(return_value={"result": {"ok": True}})),
            patch("app.api.command_center.ApprovalService") as approval_service_class,
            patch("app.api.command_center.MicrosoftGraphService", return_value=graph_service),
        ):
            approval_service_class.return_value.list_pending.return_value = {"items": []}
            response = await feed(user_id="user-1", workspace_id=None)

        self.assertEqual(response["counts"]["repliesNeeded"], 0)
        self.assertEqual(response["counts"]["unreadEmail"], 2)
        self.assertEqual(len([item for item in response["items"] if item["type"] == "email"]), 2)
        self.assertEqual(response["items"][0]["primaryActionLabel"], "Review Email")

    async def test_feed_adds_upcoming_calendar_items_from_graph_status(self) -> None:
        microsoft_connection = Mock()
        microsoft_connection.get_status.return_value = {
            "connected": True,
            "email": "user@example.com",
        }
        today = datetime.now(ZoneInfo("UTC"))
        tomorrow = today + timedelta(days=1)
        graph_service = Mock()
        graph_service.get_recent_teams_chats = AsyncMock(return_value={"value": []})
        graph_service.get_unread_messages = AsyncMock(return_value={"value": []})
        graph_service.get_calendar_range = AsyncMock(
            return_value={
                "value": [
                    {
                        "id": "event-today",
                        "subject": "Today Sync",
                        "start": {"dateTime": today.isoformat(), "timeZone": "UTC"},
                    },
                    {
                        "id": "event-tomorrow",
                        "subject": "Tomorrow Review",
                        "start": {"dateTime": tomorrow.isoformat(), "timeZone": "UTC"},
                    },
                ]
            }
        )

        with (
            patch("app.api.command_center.MicrosoftConnectionService", return_value=microsoft_connection),
            patch("app.api.command_center.call_tool", new=AsyncMock(return_value={"result": {"ok": True}})),
            patch("app.api.command_center.ApprovalService") as approval_service_class,
            patch("app.api.command_center.MicrosoftGraphService", return_value=graph_service),
        ):
            approval_service_class.return_value.list_pending.return_value = {"items": []}
            response = await feed(user_id="user-1", workspace_id=None, timezone="UTC")

        self.assertEqual(response["counts"]["upcomingMeetings"], 2)
        self.assertEqual(response["counts"]["meetingsToday"], 1)
        self.assertEqual(len([item for item in response["items"] if item["type"] == "calendar"]), 2)

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
