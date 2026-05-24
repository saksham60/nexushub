from __future__ import annotations

from datetime import UTC, datetime, time, timedelta
from typing import Any

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
        start = datetime.combine(now.date(), time.min, tzinfo=UTC)
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
                    created = await client.post(
                        f"/me/messages/{original_message_id}/createReply",
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
                        f"/me/messages/{draft_id}",
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

    async def _get(
        self,
        user_id: str,
        workspace_id: str | None,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        token = await get_valid_microsoft_access_token(user_id, workspace_id)
        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(
                base_url=GRAPH_BASE_URL, timeout=20.0
            ) as client:
                response = await client.get(path, params=params, headers=headers)
        except httpx.HTTPError as exc:
            raise GraphServiceError("Microsoft Graph request failed.") from exc
        if response.status_code >= 400:
            raise GraphServiceError("Microsoft Graph returned an error.")
        payload = response.json()
        return payload if isinstance(payload, dict) else {"value": payload}

    async def _raise_for_draft_error(self, response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        message = "Microsoft Graph draft creation failed."
        try:
            payload = response.json()
            graph_error = payload.get("error") if isinstance(payload, dict) else None
            if isinstance(graph_error, dict) and graph_error.get("message"):
                message = str(graph_error["message"])
        except ValueError:
            pass

        if response.status_code in {401, 403}:
            raise ConsentRequiredError(
                "Mail.ReadWrite permission is missing or expired. Reconnect Microsoft 365 and consent to Mail.ReadWrite."
            )
        raise GraphServiceError(message)
