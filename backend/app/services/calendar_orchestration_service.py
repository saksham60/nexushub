from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from app.core.errors import ConfigurationError
from app.services.microsoft_connection_service import MicrosoftConnectionService
from app.services.microsoft_graph_service import MicrosoftGraphService


class CalendarOrchestrationService:
    async def prepare_schedule_approval(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        subject: str,
        start_time: str,
        end_time: str | None,
        attendees: list[str],
        timezone: str,
    ) -> dict[str, Any]:
        graph_service = MicrosoftGraphService()

        # 1. Permission Check
        if not MicrosoftConnectionService().has_scope(
            user_id=user_id, workspace_id=workspace_id, scope="Calendars.ReadWrite"
        ):
            return {
                "error": True,
                "type": "consent_required",
                "message": "Calendars.ReadWrite permission is missing. Reconnect Microsoft 365 and consent.",
            }

        # 2. Parse Dates and Duration
        try:
            start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        except ValueError:
            return {"error": True, "message": "Invalid start time format."}

        if end_time:
            try:
                end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
            except ValueError:
                return {"error": True, "message": "Invalid end time format."}
        else:
            end_dt = start_dt + timedelta(minutes=30)

        # 3. Resolve Attendees
        resolved_attendees: list[str] = []
        for att in attendees:
            if "@" in att:
                resolved_attendees.append(att)
            else:
                matches = await graph_service.resolve_attendee(
                    user_id=user_id, workspace_id=workspace_id, name=att
                )
                if not matches:
                    return {
                        "clarification_required": True,
                        "message": f"Could not find an email for '{att}'. Please provide their exact email address.",
                    }
                if len(matches) > 1:
                    options = ", ".join([m.get("scoredEmailAddresses", [{}])[0].get("address", m.get("displayName", "")) for m in matches[:3]])
                    return {
                        "clarification_required": True,
                        "message": f"Found multiple matches for '{att}' (e.g. {options}). Please provide their exact email.",
                    }
                
                # Single match
                match = matches[0]
                emails = match.get("scoredEmailAddresses", [])
                if emails and emails[0].get("address"):
                    resolved_attendees.append(emails[0]["address"])
                else:
                    return {
                        "clarification_required": True,
                        "message": f"Could not find an email address for contact '{att}'.",
                    }

        # 4. Check Conflicts
        conflicts = await graph_service.check_conflicts(
            user_id=user_id,
            workspace_id=workspace_id,
            start=start_dt,
            end=end_dt,
            timezone=timezone,
        )
        conflict_warning = None
        if conflicts:
            conflict = conflicts[0]
            conflict_warning = {
                "subject": conflict.get("subject"),
                "time": f"{conflict.get('start', {}).get('dateTime')} to {conflict.get('end', {}).get('dateTime')}",
            }

        # 5. Build Approval Payload
        payload = {
            "subject": subject,
            "targetStartTime": start_dt.isoformat(),
            "targetEndTime": end_dt.isoformat(),
            "timeZone": timezone,
            "attendees": resolved_attendees,
            "isOnlineMeeting": True,
        }

        preview = {
            "kind": "calendar_schedule",
            "title": "Review meeting schedule",
            "subject": subject,
            "targetStartTime": start_dt.isoformat(),
            "targetEndTime": end_dt.isoformat(),
            "timeZone": timezone,
            "attendees": resolved_attendees,
            "conflictWarning": conflict_warning,
            "isOnlineMeeting": True,
        }

        return {
            "success": True,
            "payload": payload,
            "preview": preview,
        }

    async def prepare_reschedule_approval(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        event_id: str | None,
        meeting_title: str | None,
        target_start_time: str,
        target_end_time: str | None,
        timezone: str,
    ) -> dict[str, Any]:
        graph_service = MicrosoftGraphService()

        # 1. Permission Check
        if not MicrosoftConnectionService().has_scope(
            user_id=user_id, workspace_id=workspace_id, scope="Calendars.ReadWrite"
        ):
            return {
                "error": True,
                "type": "consent_required",
                "message": "Calendars.ReadWrite permission is missing. Reconnect Microsoft 365 and consent.",
            }

        # 2. Parse Target Dates
        try:
            target_start_dt = datetime.fromisoformat(target_start_time.replace("Z", "+00:00"))
        except ValueError:
            return {"error": True, "message": "Invalid target start time format."}

        # 3. Resolve Event
        if not event_id and not meeting_title:
            return {"error": True, "message": "Must provide eventId or meetingTitle to reschedule."}

        found_event = None
        if event_id:
            # We don't have a direct get_event_by_id in graph_service exposed this way, but if we need it we can add it.
            # But the UI usually passes event_id from a brief, so let's assume it exists, or look it up.
            pass
        
        # If we need to find it by title
        if not event_id and meeting_title:
            events = await graph_service.find_events(
                user_id=user_id,
                workspace_id=workspace_id,
                subject=meeting_title,
                timezone=timezone,
            )
            if not events:
                return {
                    "clarification_required": True,
                    "message": f"Could not find any upcoming meeting matching '{meeting_title}'.",
                }
            if len(events) > 1:
                return {
                    "clarification_required": True,
                    "message": f"Found multiple upcoming meetings matching '{meeting_title}'. Which one do you mean?",
                }
            found_event = events[0]
            event_id = found_event.get("id")

        if not event_id:
            return {"error": True, "message": "Could not resolve event id."}

        # Target end time
        if target_end_time:
            try:
                target_end_dt = datetime.fromisoformat(target_end_time.replace("Z", "+00:00"))
            except ValueError:
                return {"error": True, "message": "Invalid target end time format."}
        else:
            # Try to keep same duration if we found the event
            if found_event and found_event.get("start") and found_event.get("end"):
                try:
                    old_s = datetime.fromisoformat(found_event["start"]["dateTime"].replace("Z", "+00:00"))
                    old_e = datetime.fromisoformat(found_event["end"]["dateTime"].replace("Z", "+00:00"))
                    duration = old_e - old_s
                    target_end_dt = target_start_dt + duration
                except Exception:
                    target_end_dt = target_start_dt + timedelta(minutes=30)
            else:
                target_end_dt = target_start_dt + timedelta(minutes=30)

        # Recurring check
        recurring_warning = False
        if found_event and found_event.get("type") in ("occurrence", "seriesMaster"):
            recurring_warning = True

        # 4. Check Conflicts
        conflicts = await graph_service.check_conflicts(
            user_id=user_id,
            workspace_id=workspace_id,
            start=target_start_dt,
            end=target_end_dt,
            timezone=timezone,
        )
        # Filter out the event itself
        conflicts = [c for c in conflicts if c.get("id") != event_id]
        
        conflict_warning = None
        if conflicts:
            conflict = conflicts[0]
            conflict_warning = {
                "subject": conflict.get("subject"),
                "time": f"{conflict.get('start', {}).get('dateTime')} to {conflict.get('end', {}).get('dateTime')}",
            }

        # 5. Build Approval Payload
        payload = {
            "eventId": event_id,
            "subject": found_event.get("subject") if found_event else meeting_title,
            "targetStartTime": target_start_dt.isoformat(),
            "targetEndTime": target_end_dt.isoformat(),
            "timeZone": timezone,
        }

        preview = {
            "kind": "calendar_reschedule",
            "title": "Review meeting reschedule",
            "subject": found_event.get("subject") if found_event else meeting_title,
            "current_time": found_event.get("start", {}).get("dateTime") if found_event else None,
            "targetStartTime": target_start_dt.isoformat(),
            "targetEndTime": target_end_dt.isoformat(),
            "timeZone": timezone,
            "conflictWarning": conflict_warning,
            "recurringWarning": recurring_warning,
        }

        return {
            "success": True,
            "payload": payload,
            "preview": preview,
        }
