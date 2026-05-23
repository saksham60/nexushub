from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any


def urgent_mentions(*, days: int, max_results: int) -> dict[str, Any]:
    now = datetime.now(UTC)
    items = [
        {
            "channel": "Leadership / Budget",
            "sender": "Alex Morgan",
            "preview": "@you urgent: need the Q2 budget approval position before the finance cutoff.",
            "timestamp": (now - timedelta(minutes=48)).isoformat(),
            "urgency": "high",
            "reason": "Direct mention with urgent budget approval language.",
        },
        {
            "channel": "Product Launch",
            "sender": "Priya Shah",
            "preview": "Blocked on final launch checklist review. Can someone confirm sign-off owner?",
            "timestamp": (now - timedelta(hours=3)).isoformat(),
            "urgency": "high",
            "reason": "Blocked launch item and sign-off owner missing.",
        },
        {
            "channel": "Customer Success",
            "sender": "Jordan Lee",
            "preview": "Need follow-up before the account review. Owner and ETA still unclear.",
            "timestamp": (now - timedelta(days=1)).isoformat(),
            "urgency": "medium",
            "reason": "Action needed before customer review.",
        },
    ]
    return {"windowDays": days, "count": len(items[:max_results]), "items": items[:max_results]}


def meeting_summaries(*, days: int, max_results: int) -> dict[str, Any]:
    items = [
        {
            "meetingId": "meet_mock_001",
            "title": "Q2 Budget Review",
            "recap": "Finance reviewed revised vendor costs and proposed moving part of the analytics pilot to Q3.",
            "decisions": [
                "Vendor renewal remains on track pending business approval.",
                "Finance needs final written approval before Friday cutoff.",
            ],
            "blockers": ["No named owner yet for communicating the tradeoff to procurement."],
            "actionItems": [
                {
                    "task": "Confirm approval position on revised vendor allocation",
                    "owner": "You",
                    "dueDate": "Friday",
                },
                {
                    "task": "Send final procurement note",
                    "owner": "Alex Morgan",
                    "dueDate": "Friday",
                },
            ],
        },
        {
            "meetingId": "meet_mock_002",
            "title": "Product Launch Readiness",
            "recap": "Launch checklist is mostly complete; legal and finance dependencies remain.",
            "decisions": ["Keep launch date unchanged unless vendor approval slips."],
            "blockers": ["Budget approval and final risk acceptance."],
            "actionItems": [
                {
                    "task": "Review risk acceptance note",
                    "owner": "Priya Shah",
                    "dueDate": "Tomorrow",
                }
            ],
        },
    ]
    return {"windowDays": days, "count": len(items[:max_results]), "items": items[:max_results]}
