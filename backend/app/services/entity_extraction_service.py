from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class GraphFragment:
    nodes: list[dict[str, Any]] = field(default_factory=list)
    edges: list[dict[str, Any]] = field(default_factory=list)

    def extend(self, other: "GraphFragment") -> None:
        self.nodes.extend(other.nodes)
        self.edges.extend(other.edges)


class EntityExtractionService:
    def extract_from_emails(
        self,
        emails: list[dict[str, Any]],
        *,
        user_node_id: str | None = None,
        current_user_email: str | None = None,
    ) -> GraphFragment:
        fragment = GraphFragment()
        owner_email = _normalize_email(current_user_email)

        for msg in emails:
            raw_id = _stable_value(
                msg.get("id"),
                msg.get("internetMessageId"),
                msg.get("conversationId"),
                msg.get("receivedDateTime"),
                msg.get("subject"),
            )
            email_id = f"email:{raw_id}"
            subject = str(msg.get("subject") or "No Subject")
            participants: set[str] = set()

            fragment.nodes.append(
                {
                    "id": email_id,
                    "type": "email",
                    "label": _short_label(subject),
                    "title": subject,
                    "source": "outlook",
                    "metadata": {
                        "externalId": raw_id,
                        "threadId": msg.get("conversationId"),
                        "receivedAt": msg.get("receivedDateTime"),
                        "webLink": msg.get("webLink"),
                        "isRead": msg.get("isRead"),
                        "importance": msg.get("importance"),
                        "bodyPreview": msg.get("bodyPreview"),
                    },
                    "actions": [
                        {
                            "label": "Draft Reply",
                            "canvasType": "compose_email",
                            "payload": {"messageId": raw_id},
                        }
                    ],
                }
            )

            sender = _email_address(msg.get("from", {}).get("emailAddress", {}))
            if sender:
                participants.add(sender["address"])
                fragment.nodes.append(_person_node(sender, "outlook"))
                fragment.edges.append(
                    _edge(
                        source=email_id,
                        target=f"person:{sender['address']}",
                        edge_type="sent_by",
                        source_system="outlook",
                        weight=1.0,
                        label="Sent by",
                    )
                )

            for recipient in msg.get("toRecipients", []) or []:
                recipient_email = _email_address(recipient.get("emailAddress", {}))
                if not recipient_email:
                    continue
                participants.add(recipient_email["address"])
                fragment.nodes.append(_person_node(recipient_email, "outlook"))
                fragment.edges.append(
                    _edge(
                        source=email_id,
                        target=f"person:{recipient_email['address']}",
                        edge_type="received_by",
                        source_system="outlook",
                        weight=0.7,
                        label="Received by",
                    )
                )

            if user_node_id and (not owner_email or owner_email not in participants):
                fragment.edges.append(
                    _edge(
                        source=user_node_id,
                        target=email_id,
                        edge_type="related_to",
                        source_system="nexushub",
                        weight=0.1,
                        label="Mailbox item",
                        metadata={"implicitOwner": "mailbox"},
                    )
                )

        return fragment

    def extract_from_meetings(
        self,
        meetings: list[dict[str, Any]],
        *,
        user_node_id: str | None = None,
        current_user_email: str | None = None,
    ) -> GraphFragment:
        fragment = GraphFragment()
        owner_email = _normalize_email(current_user_email)

        for meeting in meetings:
            raw_id = _stable_value(
                meeting.get("id"),
                meeting.get("iCalUId"),
                meeting.get("start", {}).get("dateTime"),
                meeting.get("subject"),
            )
            meeting_id = f"meeting:{raw_id}"
            subject = str(meeting.get("subject") or "No Subject")
            participants: set[str] = set()

            fragment.nodes.append(
                {
                    "id": meeting_id,
                    "type": "meeting",
                    "label": _short_label(subject),
                    "title": subject,
                    "source": "calendar",
                    "metadata": {
                        "externalId": raw_id,
                        "start": meeting.get("start", {}).get("dateTime"),
                        "end": meeting.get("end", {}).get("dateTime"),
                        "location": meeting.get("location", {}).get("displayName"),
                        "isOnlineMeeting": meeting.get("isOnlineMeeting"),
                        "webLink": meeting.get("webLink"),
                        "bodyPreview": meeting.get("bodyPreview"),
                    },
                    "actions": [
                        {
                            "label": "Prepare Meeting",
                            "canvasType": "document_intelligence",
                            "payload": {"meetingId": raw_id},
                        },
                        {
                            "label": "Schedule Follow-up",
                            "canvasType": "schedule_meeting",
                            "payload": {"sourceMeetingId": raw_id},
                        },
                    ],
                }
            )

            organizer = _email_address(
                meeting.get("organizer", {}).get("emailAddress", {})
            )
            if organizer:
                participants.add(organizer["address"])
                fragment.nodes.append(_person_node(organizer, "calendar"))
                fragment.edges.append(
                    _edge(
                        source=meeting_id,
                        target=f"person:{organizer['address']}",
                        edge_type="created_by",
                        source_system="calendar",
                        weight=1.0,
                        label="Organized by",
                    )
                )

            for attendee in meeting.get("attendees", []) or []:
                attendee_email = _email_address(attendee.get("emailAddress", {}))
                if not attendee_email:
                    continue
                participants.add(attendee_email["address"])
                fragment.nodes.append(_person_node(attendee_email, "calendar"))
                fragment.edges.append(
                    _edge(
                        source=meeting_id,
                        target=f"person:{attendee_email['address']}",
                        edge_type="attended_by",
                        source_system="calendar",
                        weight=1.0,
                        label="Attended by",
                        metadata={"responseStatus": attendee.get("status")},
                    )
                )

            if user_node_id and (not owner_email or owner_email not in participants):
                fragment.edges.append(
                    _edge(
                        source=user_node_id,
                        target=meeting_id,
                        edge_type="related_to",
                        source_system="nexushub",
                        weight=0.1,
                        label="Calendar item",
                        metadata={"implicitOwner": "calendar"},
                    )
                )

        return fragment

    def extract_from_documents(
        self,
        documents: list[dict[str, Any]],
        *,
        user_node_id: str | None = None,
        current_user_email: str | None = None,
    ) -> GraphFragment:
        fragment = GraphFragment()
        owner_email = _normalize_email(current_user_email)

        for document in documents:
            raw_id = _stable_value(
                document.get("id"),
                document.get("webUrl"),
                document.get("name"),
                document.get("lastModifiedDateTime"),
            )
            doc_id = f"document:{raw_id}"
            name = str(document.get("name") or "Unknown File")
            modifier = _document_modifier(document)
            modifier_email = modifier["address"] if modifier else None

            fragment.nodes.append(
                {
                    "id": doc_id,
                    "type": "document",
                    "label": _short_label(name),
                    "title": name,
                    "source": "onedrive",
                    "metadata": {
                        "externalId": raw_id,
                        "webUrl": document.get("webUrl"),
                        "lastModifiedDateTime": document.get("lastModifiedDateTime"),
                        "size": document.get("size"),
                        "isFolder": bool(document.get("folder")),
                    },
                    "actions": [
                        {
                            "label": "Analyze Document",
                            "canvasType": "document_intelligence",
                            "payload": {"documentId": raw_id, "webUrl": document.get("webUrl")},
                        }
                    ],
                }
            )

            if modifier:
                fragment.nodes.append(_person_node(modifier, "onedrive"))
                fragment.edges.append(
                    _edge(
                        source=doc_id,
                        target=f"person:{modifier['address']}",
                        edge_type="modified_by",
                        source_system="onedrive",
                        weight=1.0,
                        label="Modified by",
                    )
                )

            if user_node_id and (not owner_email or owner_email != modifier_email):
                fragment.edges.append(
                    _edge(
                        source=user_node_id,
                        target=doc_id,
                        edge_type="related_to",
                        source_system="nexushub",
                        weight=0.1,
                        label="Recent file",
                        metadata={"implicitOwner": "drive_recent"},
                    )
                )

        return fragment


def _person_node(person: dict[str, str], source: str) -> dict[str, Any]:
    email = person["address"]
    return {
        "id": f"person:{email}",
        "type": "person",
        "label": person.get("name") or email,
        "source": source,
        "metadata": {"email": email, "sourceSystems": [source]},
        "actions": [
            {
                "label": "Compose Email",
                "canvasType": "compose_email",
                "payload": {"to": [email]},
            }
        ],
    }


def _edge(
    *,
    source: str,
    target: str,
    edge_type: str,
    source_system: str,
    weight: float,
    label: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": f"{source}:{edge_type}:{target}",
        "source": source,
        "target": target,
        "type": edge_type,
        "label": label,
        "sourceSystem": source_system,
        "weight": weight,
        "metadata": metadata or {},
    }


def _email_address(value: dict[str, Any]) -> dict[str, str] | None:
    address = _normalize_email(value.get("address"))
    if not address:
        return None
    return {"address": address, "name": str(value.get("name") or "").strip()}


def _document_modifier(document: dict[str, Any]) -> dict[str, str] | None:
    modifier = document.get("lastModifiedBy", {}).get("user", {})
    address = _normalize_email(
        modifier.get("email") or modifier.get("userPrincipalName")
    )
    if not address:
        return None
    return {
        "address": address,
        "name": str(modifier.get("displayName") or "").strip(),
    }


def _normalize_email(value: Any) -> str | None:
    if not value:
        return None
    email = str(value).strip().lower()
    return email or None


def _stable_value(*values: Any) -> str:
    for value in values:
        if value is not None and str(value).strip():
            return str(value).strip()
    return "unknown"


def _short_label(value: str, limit: int = 50) -> str:
    clean = " ".join(value.split())
    return clean[:limit] + ("..." if len(clean) > limit else "")
