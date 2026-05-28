from typing import Any
import uuid

class EntityExtractionService:
    def extract_from_emails(self, emails: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        nodes = []
        edges = []
        for msg in emails:
            email_id = msg.get("id", str(uuid.uuid4()))
            subject = msg.get("subject", "No Subject")
            
            # Email Node
            nodes.append({
                "id": email_id,
                "type": "email",
                "label": subject[:50] + ("..." if len(subject) > 50 else ""),
                "title": subject,
                "source": "outlook",
                "metadata": {"threadId": msg.get("conversationId"), "receivedAt": msg.get("receivedDateTime")},
                "actions": [{"label": "Draft Reply", "canvasType": "compose_email", "payload": {"messageId": email_id}}]
            })
            
            # Sender Node & Edge
            sender_dict = msg.get("from", {}).get("emailAddress", {})
            if sender_dict and sender_dict.get("address"):
                sender_id = sender_dict["address"]
                nodes.append({
                    "id": sender_id,
                    "type": "person",
                    "label": sender_dict.get("name") or sender_id,
                    "source": "outlook",
                    "metadata": {"email": sender_id},
                    "actions": [{"label": "Compose Email", "canvasType": "compose_email", "payload": {"to": [sender_id]}}]
                })
                edges.append({
                    "id": f"{sender_id}_sent_{email_id}",
                    "source": sender_id,
                    "target": email_id,
                    "type": "sent_by",
                    "sourceSystem": "outlook",
                    "weight": 1.0
                })
                
            # Recipients
            for r in msg.get("toRecipients", []):
                r_dict = r.get("emailAddress", {})
                if r_dict and r_dict.get("address"):
                    r_id = r_dict["address"]
                    nodes.append({
                        "id": r_id,
                        "type": "person",
                        "label": r_dict.get("name") or r_id,
                        "source": "outlook",
                        "metadata": {"email": r_id},
                        "actions": [{"label": "Compose Email", "canvasType": "compose_email", "payload": {"to": [r_id]}}]
                    })
                    edges.append({
                        "id": f"{email_id}_received_{r_id}",
                        "source": email_id,
                        "target": r_id,
                        "type": "received_by",
                        "sourceSystem": "outlook",
                        "weight": 0.5
                    })
                    
        return {"nodes": nodes, "edges": edges}

    def extract_from_meetings(self, meetings: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        nodes = []
        edges = []
        for m in meetings:
            meet_id = m.get("id", str(uuid.uuid4()))
            subject = m.get("subject", "No Subject")
            
            # Meeting Node
            nodes.append({
                "id": meet_id,
                "type": "meeting",
                "label": subject[:50],
                "title": subject,
                "source": "calendar",
                "metadata": {"start": m.get("start", {}).get("dateTime")},
                "actions": [{"label": "Meeting Prep", "canvasType": "document_intelligence", "payload": {"meetingId": meet_id}}]
            })
            
            for att in m.get("attendees", []):
                a_dict = att.get("emailAddress", {})
                if a_dict and a_dict.get("address"):
                    a_id = a_dict["address"]
                    nodes.append({
                        "id": a_id,
                        "type": "person",
                        "label": a_dict.get("name") or a_id,
                        "source": "calendar",
                        "metadata": {"email": a_id},
                        "actions": [{"label": "Compose Email", "canvasType": "compose_email", "payload": {"to": [a_id]}}]
                    })
                    edges.append({
                        "id": f"{a_id}_attended_{meet_id}",
                        "source": a_id,
                        "target": meet_id,
                        "type": "attended_by",
                        "sourceSystem": "calendar",
                        "weight": 1.0
                    })
                    
        return {"nodes": nodes, "edges": edges}

    def extract_from_documents(self, documents: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        nodes = []
        edges = []
        for d in documents:
            doc_id = d.get("id", str(uuid.uuid4()))
            name = d.get("name", "Unknown File")
            
            # Document Node
            nodes.append({
                "id": doc_id,
                "type": "document",
                "label": name[:50],
                "title": name,
                "source": "onedrive",
                "metadata": {"webUrl": d.get("webUrl")},
                "actions": [{"label": "Intelligence", "canvasType": "document_intelligence", "payload": {"documentId": doc_id}}]
            })
            
            mod_by = d.get("lastModifiedBy", {}).get("user", {})
            if mod_by and mod_by.get("email"):
                u_id = mod_by["email"]
                nodes.append({
                    "id": u_id,
                    "type": "person",
                    "label": mod_by.get("displayName") or u_id,
                    "source": "onedrive",
                    "metadata": {"email": u_id},
                    "actions": [{"label": "Compose Email", "canvasType": "compose_email", "payload": {"to": [u_id]}}]
                })
                edges.append({
                    "id": f"{u_id}_modified_{doc_id}",
                    "source": u_id,
                    "target": doc_id,
                    "type": "modified_by",
                    "sourceSystem": "onedrive",
                    "weight": 1.0
                })
                
        return {"nodes": nodes, "edges": edges}
