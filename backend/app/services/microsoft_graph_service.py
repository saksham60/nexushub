from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from urllib.parse import quote
from zoneinfo import ZoneInfo

import httpx

from app.core.errors import GraphServiceError
from app.core.errors import ConsentRequiredError
from app.services.microsoft_token_service import get_valid_microsoft_access_token

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


class MicrosoftGraphService:
    async def get_me(
        self, user_id: str, workspace_id: str | None = None
    ) -> dict[str, Any]:
        return await self._get(
            user_id,
            workspace_id,
            "/me",
            params={"$select": "id,displayName,mail,userPrincipalName"},
        )

    async def get_recent_messages(
        self, user_id: str, workspace_id: str | None = None, top: int = 10
    ) -> dict[str, Any]:
        return await self._get(
            user_id,
            workspace_id,
            "/me/messages",
            params={
                "$top": min(max(top, 1), 50),
                "$orderby": "receivedDateTime desc",
                "$select": "id,conversationId,from,replyTo,toRecipients,subject,bodyPreview,body,webLink,receivedDateTime,isRead,importance",
            },
        )

    async def get_message(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        message_id: str,
    ) -> dict[str, Any]:
        return await self._get(
            user_id,
            workspace_id,
            f"/me/messages/{_graph_path_segment(message_id)}",
            params={
                "$select": "id,subject,toRecipients,ccRecipients,bccRecipients,createdDateTime,internetMessageId",
            },
        )

    async def get_today_calendar(
        self, user_id: str, workspace_id: str | None = None
    ) -> dict[str, Any]:
        now = datetime.now(UTC)
        return await self.get_calendar_for_date(
            user_id=user_id,
            workspace_id=workspace_id,
            day=now.date(),
            timezone="UTC",
        )

    async def get_calendar_for_date(
        self,
        *,
        user_id: str,
        workspace_id: str | None = None,
        day: date,
        timezone: str = "UTC",
    ) -> dict[str, Any]:
        tz = ZoneInfo(timezone)
        start = datetime.combine(day, time.min, tzinfo=tz)
        end = start + timedelta(days=1)
        return await self._get(
            user_id,
            workspace_id,
            "/me/calendarView",
            params={
                "startDateTime": start.isoformat(),
                "endDateTime": end.isoformat(),
                "$orderby": "start/dateTime",
                "$top": 50,
                "$select": "id,subject,start,end,location,organizer,attendees,bodyPreview,isOnlineMeeting",
            },
            prefer_timezone=timezone,
        )

    async def get_recent_files(
        self, user_id: str, workspace_id: str | None = None, top: int = 10
    ) -> dict[str, Any]:
        return await self._get(
            user_id,
            workspace_id,
            "/me/drive/recent",
            params={
                "$top": min(max(top, 1), 50),
                "$select": "id,name,webUrl,lastModifiedDateTime,size,file,folder,remoteItem",
            },
        )

    async def get_recent_teams_chats(
        self, user_id: str, workspace_id: str | None = None, top: int = 20
    ) -> dict[str, Any]:
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.get(
                    "/me/chats",
                    params={
                        "$expand": "lastMessagePreview",
                        "$orderby": "lastMessagePreview/createdDateTime desc",
                        "$top": min(max(top, 1), 50),
                    },
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph request failed.") from exc
            
        if response.status_code >= 400:
            await self._raise_for_teams_error(response)
            
        payload = response.json()
        return payload if isinstance(payload, dict) else {"value": payload}

    async def get_recent_chat_messages(
        self, chat_id: str, user_id: str, workspace_id: str | None = None, top: int = 10
    ) -> dict[str, Any]:
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.get(
                    f"/me/chats/{_graph_path_segment(chat_id)}/messages",
                    params={
                        "$top": min(max(top, 1), 50),
                        "$orderby": "createdDateTime desc",
                    },
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph request failed.") from exc
            
        if response.status_code >= 400:
            await self._raise_for_teams_error(response)
            
        payload = response.json()
        return payload if isinstance(payload, dict) else {"value": payload}

    async def create_draft_reply(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        original_message_id: str | None,
        subject: str,
        recipients: list[str],
        body: str,
    ) -> dict[str, Any]:
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        message_payload = {
            "subject": subject,
            "body": {"contentType": "Text", "content": body},
            "toRecipients": [
                {"emailAddress": {"address": recipient}}
                for recipient in recipients
                if recipient
            ],
        }

        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                if original_message_id:
                    original_id_path = _graph_path_segment(original_message_id)
                    created = await client.post(
                        f"/me/messages/{original_id_path}/createReply",
                        headers=headers,
                    )
                    if _should_fallback_to_standalone_draft(created):
                        fallback_reason = _graph_error_message(
                            created,
                            "Microsoft Graph could not create a threaded reply draft.",
                        )
                        return await self._create_standalone_draft(
                            client=client,
                            headers=headers,
                            message_payload=message_payload,
                            fallback_reason=fallback_reason,
                        )
                    await self._raise_for_draft_error(created)
                    draft = created.json()
                    draft_id = draft.get("id")
                    if not draft_id:
                        raise GraphServiceError("Microsoft Graph did not return a draft id.")

                    patch_payload = {
                        "subject": subject,
                        "body": {"contentType": "Text", "content": body},
                    }
                    if message_payload["toRecipients"]:
                        patch_payload["toRecipients"] = message_payload["toRecipients"]

                    patched = await client.patch(
                        f"/me/messages/{_graph_path_segment(draft_id)}",
                        json=patch_payload,
                        headers={**headers, "Content-Type": "application/json"},
                    )
                    await self._raise_for_draft_error(patched)
                    return {
                        "id": draft_id,
                        "webLink": draft.get("webLink"),
                        "createdDateTime": draft.get("createdDateTime"),
                        "createdVia": "reply_draft",
                    }

                return await self._create_standalone_draft(
                    client=client,
                    headers=headers,
                    message_payload=message_payload,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph draft creation failed.") from exc

    async def _create_standalone_draft(
        self,
        *,
        client: httpx.AsyncClient,
        headers: dict[str, str],
        message_payload: dict[str, Any],
        fallback_reason: str | None = None,
    ) -> dict[str, Any]:
        created = await client.post(
            "/me/messages",
            json=message_payload,
            headers={**headers, "Content-Type": "application/json"},
        )
        await self._raise_for_draft_error(created)
        payload = created.json()
        if not isinstance(payload, dict):
            return {"value": payload}
        payload["createdVia"] = "standalone_draft"
        if fallback_reason:
            payload["replyFallbackReason"] = fallback_reason
        return payload

    async def send_draft(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        draft_id: str,
    ) -> None:
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.post(
                    f"/me/messages/{_graph_path_segment(draft_id)}/send",
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph send failed.") from exc
        await self._raise_for_send_error(response)

    async def update_event_time(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        event_id: str,
        start: datetime,
        end: datetime,
        timezone: str,
    ) -> dict[str, Any]:
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Prefer": f'outlook.timezone="{timezone}"',
        }
        payload = {
            "start": {"dateTime": _graph_datetime(start), "timeZone": timezone},
            "end": {"dateTime": _graph_datetime(end), "timeZone": timezone},
        }
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.patch(
                    f"/me/events/{_graph_path_segment(event_id)}",
                    json=payload,
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph event update failed.") from exc
        await self._raise_for_calendar_write_error(response)
        updated = response.json()
        return updated if isinstance(updated, dict) else {"value": updated}

    async def create_event(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        subject: str,
        start: datetime,
        end: datetime,
        timezone: str,
        attendees: list[str],
        is_online_meeting: bool = True,
    ) -> dict[str, Any]:
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Prefer": f'outlook.timezone="{timezone}"',
        }
        payload: dict[str, Any] = {
            "subject": subject,
            "start": {"dateTime": _graph_datetime(start), "timeZone": timezone},
            "end": {"dateTime": _graph_datetime(end), "timeZone": timezone},
            "attendees": [
                {"emailAddress": {"address": att}, "type": "required"} for att in attendees
            ],
            "isOnlineMeeting": is_online_meeting,
            "onlineMeetingProvider": "teamsForBusiness" if is_online_meeting else "unknown",
        }
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.post(
                    "/me/events",
                    json=payload,
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph event creation failed.") from exc
        await self._raise_for_calendar_write_error(response)
        created = response.json()
        return created if isinstance(created, dict) else {"value": created}

    async def resolve_attendee(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        name: str,
    ) -> list[dict[str, Any]]:
        # Searches /me/people to find matching contacts
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.get(
                    f"/me/people?$search={quote(name)}",
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph people search failed.") from exc
        if response.status_code >= 400:
            if response.status_code in {401, 403}:
                raise ConsentRequiredError("People.Read permission is missing.")
            raise GraphServiceError("Microsoft Graph returned an error during attendee resolution.")
        
        payload = response.json()
        return payload.get("value", [])

    async def check_conflicts(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        start: datetime,
        end: datetime,
        timezone: str,
    ) -> list[dict[str, Any]]:
        # Searches /me/calendarView to find conflicting events
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Prefer": f'outlook.timezone="{timezone}"',
        }
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.get(
                    "/me/calendarView",
                    params={
                        "startDateTime": start.isoformat(),
                        "endDateTime": end.isoformat(),
                        "$select": "id,subject,start,end",
                    },
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph calendar view failed.") from exc
        
        if response.status_code >= 400:
            await self._raise_for_calendar_write_error(response)
        
        payload = response.json()
        return payload.get("value", [])

    async def find_events(
        self,
        *,
        user_id: str,
        workspace_id: str | None,
        subject: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        timezone: str = "UTC",
    ) -> list[dict[str, Any]]:
        # Searches /me/calendarView for events matching the subject
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Prefer": f'outlook.timezone="{timezone}"',
        }
        
        start = start_date or datetime.now(UTC)
        end = end_date or (start + timedelta(days=14))
        
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.get(
                    "/me/calendarView",
                    params={
                        "startDateTime": start.isoformat(),
                        "endDateTime": end.isoformat(),
                        "$select": "id,subject,start,end,type,seriesMasterId",
                        "$top": 50,
                    },
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph calendar view failed.") from exc
            
        if response.status_code >= 400:
            await self._raise_for_calendar_write_error(response)
            
        payload = response.json()
        events = payload.get("value", [])
        
        # Client side filter for subject
        search_term = subject.lower()
        return [
            evt for evt in events 
            if evt.get("subject") and search_term in str(evt["subject"]).lower()
        ]

    async def _get(
        self,
        user_id: str,
        workspace_id: str | None,
        path: str,
        params: dict[str, Any] | None = None,
        prefer_timezone: str | None = None,
    ) -> dict[str, Any]:
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        if prefer_timezone:
            headers["Prefer"] = f'outlook.timezone="{prefer_timezone}"'
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.get(path, params=params, headers=headers)
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph request failed.") from exc
        if response.status_code >= 400:
            raise GraphServiceError(
                _graph_error_message(response, "Microsoft Graph returned an error.")
            )
        payload = response.json()
        return payload if isinstance(payload, dict) else {"value": payload}

    async def _raise_for_draft_error(self, response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        message = _graph_error_message(response, "Microsoft Graph draft creation failed.")

        if response.status_code in {401, 403}:
            raise ConsentRequiredError(
                "Mail.ReadWrite permission is missing or expired. Reconnect Microsoft 365 and consent to Mail.ReadWrite."
            )
        raise GraphServiceError(message)

    async def _raise_for_send_error(self, response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        message = _graph_error_message(response, "Microsoft Graph send failed.")

        if response.status_code in {401, 403}:
            raise ConsentRequiredError(
                "Mail.Send permission is missing or expired. Reconnect Microsoft 365 and consent to Mail.Send."
            )
        raise GraphServiceError(message)

    async def _raise_for_calendar_write_error(self, response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        message = _graph_error_message(response, "Microsoft Graph calendar update failed.")

        if response.status_code in {401, 403}:
            raise ConsentRequiredError(
                "Calendars.ReadWrite permission is missing or expired. Reconnect Microsoft 365 and consent to Calendars.ReadWrite."
            )
        raise GraphServiceError(message)

    async def _raise_for_teams_error(self, response: httpx.Response) -> None:
        if response.status_code < 400:
            return
            
        # Personal accounts often return 400 Bad Request or 404 for /me/chats
        payload = {}
        try:
            payload = response.json()
        except Exception:
            pass
            
        error_code = str(payload.get("error", {}).get("code", "")).lower()
        if response.status_code in {400, 404} or "unsupported" in error_code or "unknown" in error_code or "notfound" in error_code:
            raise ConsentRequiredError(
                "Teams chat integration requires a Microsoft 365 work or school account."
            )
        if response.status_code in {401, 403}:
            raise ConsentRequiredError(
                "Reconnect Microsoft 365 to enable Teams chat insights."
            )
            
        message = _graph_error_message(response, "Microsoft Graph Teams request failed.")
        raise GraphServiceError(message)


def _graph_datetime(value: datetime) -> str:
    return value.replace(tzinfo=None).isoformat(timespec="seconds")


def _graph_path_segment(value: str) -> str:
    return quote(value, safe="")


def _should_fallback_to_standalone_draft(response: httpx.Response) -> bool:
    return response.status_code in {400, 404}


def _graph_error_message(response: httpx.Response, fallback: str) -> str:
    try:
        payload = response.json()
        graph_error = payload.get("error") if isinstance(payload, dict) else None
        if isinstance(graph_error, dict) and graph_error.get("message"):
            graph_code = graph_error.get("code")
            message = str(graph_error["message"])
            return f"{graph_code}: {message}" if graph_code else message
    except ValueError:
        pass
    return fallback
