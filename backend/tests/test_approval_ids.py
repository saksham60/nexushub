from __future__ import annotations

import unittest
from unittest.mock import patch

from app.core.errors import NotFoundError
from app.services.approval_service import ApprovalService, normalize_approval_id


class ApprovalIdTests(unittest.IsolatedAsyncioTestCase):
    def test_normalizes_prefixed_action_item_approval_id(self) -> None:
        approval_id = "91211af9-ab07-4e02-95aa-737846b7b797"

        self.assertEqual(normalize_approval_id(f"app_{approval_id}"), approval_id)
        self.assertEqual(normalize_approval_id(f"APP_{approval_id}"), approval_id)
        self.assertEqual(normalize_approval_id(f"approval_{approval_id}"), approval_id)
        self.assertEqual(normalize_approval_id(f"approval:{approval_id}"), approval_id)

    def test_normalizes_uppercase_uuid_to_canonical_uuid(self) -> None:
        self.assertEqual(
            normalize_approval_id("91211AF9-AB07-4E02-95AA-737846B7B797"),
            "91211af9-ab07-4e02-95aa-737846b7b797",
        )

    def test_rejects_invalid_approval_id_before_supabase_query(self) -> None:
        with self.assertRaises(NotFoundError):
            normalize_approval_id("app_not-a-uuid")

    def test_get_for_user_rejects_invalid_id_before_supabase_query(self) -> None:
        service = ApprovalService()

        with patch("app.services.approval_service.get_supabase") as get_supabase:
            with self.assertRaises(NotFoundError):
                service._get_for_user(
                    user_id="20d6fc5a-639b-4d0f-adfc-65a36d8f8f89",
                    approval_id="app_not-a-uuid",
                )

            get_supabase.assert_not_called()

    async def test_execute_approval_normalizes_prefixed_id_before_lookup(self) -> None:
        service = ApprovalService()
        approval_id = "91211af9-ab07-4e02-95aa-737846b7b797"

        with patch.object(
            service,
            "_get_for_user",
            return_value={"id": approval_id, "status": "approved", "user_id": "user-1"},
        ) as get_for_user:
            result = await service.execute_approval(
                user_id="user-1",
                approval_id=f"app_{approval_id}",
                approved=True,
            )

            self.assertEqual(result["id"], approval_id)
            get_for_user.assert_called_once_with(user_id="user-1", approval_id=approval_id)


if __name__ == "__main__":
    unittest.main()
