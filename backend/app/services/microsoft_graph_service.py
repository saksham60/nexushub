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
                "$select": "id,conversationId,from,toRecipients,subject,bodyPreview,body,webLink,receivedDateTime,isRead,importance",
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
                    }

                created = await client.post(
                    "/me/messages",
                    json=message_payload,
                    headers={**headers, "Content-Type": "application/json"},
                )
                await self._raise_for_draft_error(created)
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph draft creation failed.") from exc

        payload = created.json()
        return payload if isinstance(payload, dict) else {"value": payload}

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


def _graph_datetime(value: datetime) -> str:
    return value.replace(tzinfo=None).isoformat(timespec="seconds")


def _graph_path_segment(value: str) -> str:
    return quote(value, safe="")


def _graph_error_message(response: httpx.Response, fallback: str) -> str:
    try:
        payload = response.json()
        graph_error = payload.get("error") if isinstance(payload, dict) else None
        if isinstance(graph_error, dict) and graph_error.get("message"):
            return str(graph_error["message"])
    except ValueError:
        pass
    return fallback
