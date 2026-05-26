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


def test_reply_to_is_preferred_over_generated_outlook_alias() -> None:
    message = {
        "id": "message-1",
        "conversationId": "thread-1",
        "isRead": False,
        "subject": "Really important",
        "bodyPreview": "Can you review this today?",
        "from": {
            "emailAddress": {
                "name": "Saksham",
                "address": "outlook_4591F474B3785E27@outlook.com",
            }
        },
        "replyTo": [
            {
                "emailAddress": {
                    "name": "Saksham",
                    "address": "saksham@gmail.com",
                }
            }
        ],
    }

    item = _classify_reply_need(message)

    assert item is not None
    assert item["senderEmail"] == "saksham@gmail.com"
    assert item["senderAddress"] == "outlook_4591F474B3785E27@outlook.com"
    assert item["replyTo"] == ["saksham@gmail.com"]


def test_generated_outlook_alias_without_reply_to_is_not_classified() -> None:
    message = {
        "id": "message-1",
        "conversationId": "thread-1",
        "isRead": False,
        "subject": "Really important",
        "bodyPreview": "Can you review this today?",
        "from": {
            "emailAddress": {
                "name": "Saksham",
                "address": "outlook_4591F474B3785E27@outlook.com",
            }
        },
    }

    assert _classify_reply_need(message) is None
