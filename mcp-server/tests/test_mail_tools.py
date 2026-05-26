from nexushub_mcp.tools.mail_tools import _classify_reply_need


def test_no_reply_sender_is_not_classified_as_reply_needed() -> None:
    message = {
        "id": "message-1",
        "conversationId": "thread-1",
        "isRead": False,
        "subject": "Welcome to Outlook",
        "bodyPreview": "Please review the new features.",
        "from": {
            "emailAddress": {
                "name": "Outlook Team",
                "address": "no-reply@microsoft.com",
            }
        },
    }

    assert _classify_reply_need(message) is None


def test_human_sender_can_be_classified_as_reply_needed() -> None:
    message = {
        "id": "message-1",
        "conversationId": "thread-1",
        "isRead": False,
        "subject": "Need your input",
        "bodyPreview": "Can you review this today?",
        "from": {
            "emailAddress": {
                "name": "Saksham",
                "address": "saksham@example.com",
            }
        },
    }

    item = _classify_reply_need(message)

    assert item is not None
    assert item["senderEmail"] == "saksham@example.com"
