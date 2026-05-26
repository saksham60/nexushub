from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

from app.core.errors import ConfigurationError, ConsentRequiredError
from app.services.approval_service import ApprovalService
from app.services.calendar_reschedule_service import CalendarRescheduleService


class CalendarRescheduleTests(unittest.IsolatedAsyncioTestCase):
    async def test_prepare_reschedule_creates_calendar_approval(self) -> None:
        service = CalendarRescheduleService()

        with (
            patch("app.services.calendar_reschedule_service.MicrosoftGraphService") as graph_cls,
            patch("app.services.calendar_reschedule_service.ApprovalService") as approval_cls,
        ):
            graph_cls.return_value.get_calendar_for_date = AsyncMock(
                return_value={
                    "value": [
                        {
                            "id": "event-1",
                            "subject": "Budget Review",
                            "start": {
                                "dateTime": "2026-05-25T12:00:00",
                                "timeZone": "Asia/Kolkata",
                            },
                            "end": {
                                "dateTime": "2026-05-25T12:30:00",
                                "timeZone": "Asia/Kolkata",
                            },
                        }
                    ]
                }
            )
            approval_cls.return_value.create_approval.return_value = {
                "id": "approval-1",
                "approval_id": "approval-1",
            }

            result = await service.prepare_approval(
                user_id="user-1",
                workspace_id=None,
                arguments={
                    "sourceTime": "12:00",
                    "targetStartTime": "13:00",
                    "date": "2026-05-25",
                    "timezone": "Asia/Kolkata",
                },
                message="reschedule my 12 pm to 1 pm",
            )

            self.assertEqual(result["approvalId"], "approval-1")
            approval_payload = approval_cls.return_value.create_approval.call_args.kwargs["payload"]
            self.assertEqual(approval_payload["eventId"], "event-1")
            self.assertIn("T13:00:00", approval_payload["newStart"])

    async def test_prepare_reschedule_without_matching_event_asks_for_clarification(self) -> None:
        with patch("app.services.calendar_reschedule_service.MicrosoftGraphService") as graph_cls:
            graph_cls.return_value.get_calendar_for_date = AsyncMock(return_value={"value": []})

            with self.assertRaises(ConfigurationError):
                await CalendarRescheduleService().prepare_approval(
                    user_id="user-1",
                    workspace_id=None,
                    arguments={
                        "sourceTime": "12:00",
                        "targetStartTime": "13:00",
                        "date": "2026-05-25",
                    },
                    message="reschedule my 12 pm to 1 pm",
                )

    async def test_calendar_execute_requires_readwrite_scope(self) -> None:
        service = ApprovalService()

        with (
            patch("app.services.approval_service.MicrosoftConnectionService") as connection_cls,
            patch("app.services.approval_service.MicrosoftGraphService") as graph_cls,
        ):
            connection_cls.return_value.get_connected_account.return_value = {
                "provider_email": "exec@example.com"
            }
            connection_cls.return_value.has_scope.return_value = False

            with self.assertRaises(ConsentRequiredError):
                await service._execute_calendar_reschedule_approval(
                    user_id="user-1",
                    approval={
                        "id": "approval-1",
                        "workspace_id": None,
                        "payload": {
                            "eventId": "event-1",
                            "subject": "Budget Review",
                            "targetStartTime": "2026-05-25T13:00:00+05:30",
                            "targetEndTime": "2026-05-25T13:30:00+05:30",
                            "timezone": "Asia/Kolkata",
                        },
                    },
                    simulate=False,
                )

            graph_cls.assert_not_called()


if __name__ == "__main__":
    unittest.main()
