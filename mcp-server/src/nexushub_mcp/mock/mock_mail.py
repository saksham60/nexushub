from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

Priority = Literal["all", "high", "medium", "low"]


def find_needs_reply(*, days: int, max_results: int, priority: Priority) -> dict[str, Any]:
    now = datetime.now(UTC)
    items = [
        {
            "messageId": "msg_mock_1001",
            "threadId": "conv_q2_budget",
            "sender": "Alex Morgan",
            "subject": "Q2 budget approval and forecast changes",
            "preview": "Can you confirm whether the revised vendor line should be approved before Friday?",
            "receivedAt": (now - timedelta(hours=2)).isoformat(),
            "reason": "contains a question, approval language, recent sender",
            "urgency": "high",
        },
        {
            "messageId": "msg_mock_1002",
            "threadId": "conv_partner_launch",
            "sender": "Priya Shah",
            "subject": "Partner launch: final review?",
            "preview": "Need your sign-off on the rollout checklist and open risks by EOD.",
            "receivedAt": (now - timedelta(hours=5)).isoformat(),
            "reason": "contains a question, sign-off language",
            "urgency": "high",
        },
        {
            "messageId": "msg_mock_1003",
            "threadId": "conv_customer_escalation",
            "sender": "Jordan Lee",
            "subject": "Customer escalation follow-up",
            "preview": "Could you share the latest owner and timeline before the account review?",
            "receivedAt": (now - timedelta(days=1, hours=3)).isoformat(),
            "reason": "contains a question, customer escalation context",
            "urgency": "medium",
        },
        {
            "messageId": "msg_mock_1004",
            "threadId": "conv_weekly_metrics",
            "sender": "Finance Ops",
            "subject": "Weekly metrics reconciliation",
            "preview": "A few spreadsheet rows changed after the refresh. Please review when you can.",
            "receivedAt": (now - timedelta(days=2)).isoformat(),
            "reason": "review request from finance",
            "urgency": "low",
        },
    ]
    filtered = [item for item in items if priority == "all" or item["urgency"] == priority][
        :max_results
    ]
    groups: list[dict[str, Any]] = []
    for urgency in ("high", "medium", "low"):
        group_items = [item for item in filtered if item["urgency"] == urgency]
        if group_items:
            groups.append({"urgency": urgency, "count": len(group_items), "items": group_items})
    return {"windowDays": days, "count": len(filtered), "groups": groups}


def find_awaiting_approval(*, days: int, max_results: int) -> dict[str, Any]:
    now = datetime.now(UTC)
    items = [
        {
            "messageId": "msg_mock_2001",
            "threadId": "conv_q2_budget",
            "sender": "Alex Morgan",
            "subject": "Approval needed: Q2 budget reallocation",
            "preview": "Please approve the updated Q2 budget before finance closes the planning cycle.",
            "receivedAt": (now - timedelta(hours=4)).isoformat(),
            "matchedTerms": ["approval", "budget"],
            "reason": "Budget approval request with near-term deadline.",
        },
        {
            "messageId": "msg_mock_2002",
            "threadId": "conv_vendor_contract",
            "sender": "Legal Review",
            "subject": "Contract sign-off for Contoso renewal",
            "preview": "Legal has completed redlines. Need business sign-off before procurement proceeds.",
            "receivedAt": (now - timedelta(days=1)).isoformat(),
            "matchedTerms": ["contract", "sign-off", "review"],
            "reason": "Contract sign-off request.",
        },
        {
            "messageId": "msg_mock_2003",
            "threadId": "conv_invoice_batch",
            "sender": "Accounts Payable",
            "subject": "Invoice exception review",
            "preview": "Three invoices are above threshold and require manager review.",
            "receivedAt": (now - timedelta(days=3)).isoformat(),
            "matchedTerms": ["invoice", "review"],
            "reason": "Invoice review threshold exceeded.",
        },
    ]
    return {"windowDays": days, "count": len(items[:max_results]), "items": items[:max_results]}


def summarize_thread(*, thread_id: str | None, message_id: str | None) -> dict[str, Any]:
    return {
        "threadId": thread_id or "conv_q2_budget",
        "messageId": message_id,
        "messageCount": 6,
        "summaryBullets": [
            "Finance updated the Q2 forecast after vendor costs increased by 8%.",
            "Alex needs confirmation on whether to approve the revised vendor allocation before Friday.",
            "The open risk is whether the analytics pilot budget should be reduced or moved to Q3.",
        ],
        "requiredAction": "Review the revised budget and confirm approval or requested changes.",
        "suggestedNextSteps": [
            "Ask Alex to confirm the exact variance against the approved baseline.",
            "Approve only after the vendor delta and pilot tradeoff are explicit.",
            "Create a concise draft reply with the decision and any conditions.",
        ],
    }
