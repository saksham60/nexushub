from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

from app.core.errors import ConfigurationError, ConsentRequiredError
from app.services.approval_service import ApprovalService


class MailDraftSendTests(unittest.IsolatedAsyncioTestCase):
    async def test_simulated_send_does_not_call_graph(self) -> None:
        service = ApprovalService()

        with (
            patch("app.services.approval_service.MicrosoftConnectionService") as connection_cls,
            patch("app.services.approval_service.MicrosoftGraphService") as graph_cls,
            patch.object(service, "_audit") as audit,
        ):
            connection_cls.return_value.get_connected_account.return_value = {
                "provider_email": "exec@example.com"
            }

            result = await service.send_mail_draft(
                user_id="user-1",
                workspace_id=None,
                outlook_draft_id="draft-1",
                simulate=True,
            )

            self.assertTrue(result["success"])
            self.assertTrue(result["simulated"])
            self.assertEqual(result["mailboxEmail"], "exec@example.com")
            connection_cls.return_value.has_scope.assert_not_called()
            graph_cls.assert_not_called()
            audit.assert_called_once()

    async def test_missing_mail_send_scope_returns_consent_error(self) -> None:
        service = ApprovalService()

        with (
            patch("app.services.approval_service.MicrosoftConnectionService") as connection_cls,
            patch("app.services.approval_service.MicrosoftGraphService") as graph_cls,
            patch.object(service, "_audit"),
        ):
            connection_cls.return_value.get_connected_account.return_value = {
                "provider_email": "exec@example.com"
            }
            connection_cls.return_value.has_scope.return_value = False

            with self.assertRaises(ConsentRequiredError):
                await service.send_mail_draft(
                    user_id="user-1",
                    workspace_id=None,
                    outlook_draft_id="draft-1",
                )

            graph_cls.assert_not_called()

    async def test_send_calls_graph_when_mail_send_scope_exists(self) -> None:
        service = ApprovalService()

        with (
            patch("app.services.approval_service.MicrosoftConnectionService") as connection_cls,
            patch("app.services.approval_service.MicrosoftGraphService") as graph_cls,
            patch.object(service, "_audit") as audit,
        ):
            connection_cls.return_value.get_connected_account.return_value = {
                "provider_email": "exec@example.com"
            }
            connection_cls.return_value.has_scope.return_value = True
            graph_cls.return_value.get_message = AsyncMock(
                return_value={
                    "subject": "Re: Budget",
                    "toRecipients": [
                        {"emailAddress": {"address": "recipient@example.com"}}
                    ],
                }
            )
            graph_cls.return_value.send_draft = AsyncMock()

            result = await service.send_mail_draft(
                user_id="user-1",
                workspace_id=None,
                outlook_draft_id="draft-1",
            )

            self.assertTrue(result["success"])
            self.assertFalse(result["simulated"])
            self.assertEqual(result["deliveryStatus"], "accepted_by_outlook")
            self.assertEqual(result["recipients"], ["recipient@example.com"])
            graph_cls.return_value.get_message.assert_awaited_once_with(
                user_id="user-1",
                workspace_id=None,
                message_id="draft-1",
            )
            graph_cls.return_value.send_draft.assert_awaited_once_with(
                user_id="user-1",
                workspace_id=None,
                draft_id="draft-1",
            )
            audit.assert_called_once()

    async def test_no_reply_recipient_is_not_sendable(self) -> None:
        service = ApprovalService()

        with (
            patch("app.services.approval_service.MicrosoftConnectionService"),
            patch("app.services.approval_service.MicrosoftGraphService") as graph_cls,
        ):
            with self.assertRaises(ConfigurationError):
                await service.create_mail_draft_direct(
                    user_id="user-1",
                    workspace_id=None,
                    draft_body="Thanks for the update.",
                    subject="Re: Welcome",
                    recipients=["no-reply@microsoft.com"],
                    original_message_id="message-1",
                )

            graph_cls.assert_not_called()


if __name__ == "__main__":
    unittest.main()
