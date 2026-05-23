from __future__ import annotations

from datetime import datetime, time
from typing import Any, cast
from zoneinfo import ZoneInfo


def today_agenda(*, timezone: str) -> dict[str, Any]:
    tz = ZoneInfo(timezone)
    today = datetime.now(tz).date()

    def at(hour: int, minute: int = 0) -> str:
        return datetime.combine(today, time(hour, minute), tzinfo=tz).isoformat()

    meetings = [
        {
            "eventId": "evt_mock_001",
            "title": "Q2 Budget Review",
            "start": {"dateTime": at(9, 30), "timeZone": timezone},
            "end": {"dateTime": at(10, 15), "timeZone": timezone},
            "location": "Teams",
            "organizer": "Alex Morgan",
            "attendeeCount": 6,
            "isOnlineMeeting": True,
        },
        {
            "eventId": "evt_mock_002",
            "title": "Customer Escalation Standup",
            "start": {"dateTime": at(11, 0), "timeZone": timezone},
            "end": {"dateTime": at(11, 30), "timeZone": timezone},
            "location": "Teams",
            "organizer": "Jordan Lee",
            "attendeeCount": 5,
            "isOnlineMeeting": True,
        },
        {
            "eventId": "evt_mock_003",
            "title": "Product Launch Readiness",
            "start": {"dateTime": at(15, 0), "timeZone": timezone},
            "end": {"dateTime": at(16, 0), "timeZone": timezone},
            "location": "Room 4 / Teams",
            "organizer": "Priya Shah",
            "attendeeCount": 9,
            "isOnlineMeeting": True,
        },
    ]
    return {
        "date": today.isoformat(),
        "timezone": timezone,
        "meetings": meetings,
        "focusBlocks": [
            {
                "start": at(12, 0),
                "end": at(13, 30),
                "durationMinutes": 90,
                "reason": "Best gap for budget review follow-up before afternoon meetings.",
            },
            {
                "start": at(16, 15),
                "end": at(17, 15),
                "durationMinutes": 60,
                "reason": "Good end-of-day block for approvals and draft replies.",
            },
        ],
        "deadlines": [
            {
                "title": "Send Q2 budget decision",
                "dueAt": at(17, 0),
                "source": "mail",
                "urgency": "high",
            }
        ],
    }


def focus_blocks(*, date: str | None, timezone: str, min_block_minutes: int) -> dict[str, Any]:
    tz = ZoneInfo(timezone)
    target_date = datetime.fromisoformat(date).date() if date else datetime.now(tz).date()

    def at(hour: int, minute: int = 0) -> str:
        return datetime.combine(target_date, time(hour, minute), tzinfo=tz).isoformat()

    blocks = [
        {
            "start": at(8, 45),
            "end": at(9, 30),
            "durationMinutes": 45,
            "reason": "Quiet prep block before the first budget meeting.",
        },
        {
            "start": at(12, 0),
            "end": at(13, 30),
            "durationMinutes": 90,
            "reason": "Long uninterrupted gap for analysis work.",
        },
        {
            "start": at(16, 15),
            "end": at(17, 30),
            "durationMinutes": 75,
            "reason": "End-of-day execution block after launch readiness.",
        },
    ]
    suggested_blocks = [
        block for block in blocks if cast(int, block["durationMinutes"]) >= min_block_minutes
    ]
    return {
        "date": target_date.isoformat(),
        "timezone": timezone,
        "minBlockMinutes": min_block_minutes,
        "suggestedBlocks": suggested_blocks,
        "reasoning": "Mock schedule has three workable gaps after filtering meetings and deadlines.",
    }


def meeting_brief(*, event_id: str | None, meeting_title: str | None) -> dict[str, Any]:
    title = meeting_title or "Q2 Budget Review"
    return {
        "eventId": event_id or "evt_mock_001",
        "meetingSummary": {
            "title": title,
            "purpose": "Align on Q2 budget changes, vendor cost increases, and approval criteria.",
            "expectedOutcome": "Decision on whether to approve the revised forecast and what tradeoffs to record.",
        },
        "attendees": [
            {"name": "Alex Morgan", "role": "Finance owner"},
            {"name": "Priya Shah", "role": "Product launch lead"},
            {"name": "Jordan Lee", "role": "Customer success"},
        ],
        "relatedContext": [
            "Alex asked for approval on the revised vendor allocation before Friday.",
            "Legal sign-off is complete for the vendor renewal, but finance wants owner confirmation.",
            "The analytics pilot budget may move to Q3 if the vendor increase is approved.",
        ],
        "openQuestions": [
            "What is the approved baseline variance after the vendor increase?",
            "Which project absorbs the tradeoff if the Q2 total cannot increase?",
            "Who sends the final decision to procurement?",
        ],
        "suggestedTalkingPoints": [
            "Start with the decision needed and deadline.",
            "Ask finance to state the delta and recommended option.",
            "Close with owner, due date, and approval condition.",
        ],
    }
