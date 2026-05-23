# NexusHub

NexusHub uses this architecture:

```text
Frontend -> Backend API -> Backend Agent Orchestrator -> MCP Server -> Backend Internal Graph Service -> Microsoft Graph -> Microsoft 365
```

Architecture rules:

- Frontend never calls MCP directly.
- Backend owns Microsoft OAuth, token exchange, token refresh, encrypted token vault, user/session/workspace mapping, agent orchestration, approvals, audit logs, and MCP calls.
- MCP owns tool definitions, mock mode, stdio for Claude Desktop, and backend-internal API calls in graph mode.
- MCP does not own browser OAuth.
- MCP does not store Microsoft refresh tokens.

## Services

- `backend/`: FastAPI backend on `http://localhost:3001`
- `nexushub-mcp-server/`: existing MCP server, preserved for Claude Desktop mock mode and container HTTP mode

## Run MCP Mock Mode With Claude Desktop

Use the existing MCP server:

```powershell
cd "D:\Code\Microsoft Hackthon june 2026\Code\Backend\MCP\nexushub-mcp-server"
.venv\Scripts\activate
python -m nexushub_mcp
```

For Claude Desktop, keep:

```env
NEXUSHUB_MODE=mock
MCP_TRANSPORT=stdio
```

Claude Desktop should launch the process itself.

## Run Backend And MCP Containers

Create env files:

```bash
cp backend/.env.example backend/.env
cp nexushub-mcp-server/.env.example nexushub-mcp-server/.env
```

Set the same strong value in both env files:

```env
INTERNAL_SERVICE_TOKEN=<shared-secret>
```

Set backend-only values:

```env
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TOKEN_ENCRYPTION_KEY=
```

Generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Start services:

```bash
docker compose up --build
```

Health checks:

```text
GET http://localhost:3001/health
GET http://localhost:8010/health
```

## Microsoft Entra Setup

Redirect URI:

```text
http://localhost:3001/auth/microsoft/callback
```

Delegated permissions:

```text
openid
profile
email
offline_access
User.Read
Mail.Read
Mail.ReadWrite
Calendars.Read
Files.Read.All
```

Connect Microsoft:

```text
GET http://localhost:3001/auth/microsoft/start
```

For MVP user binding, pass a user id when available:

```text
GET http://localhost:3001/auth/microsoft/start?user_id=<uuid>
```

## Agent Test

```http
POST http://localhost:3001/agent/chat
Content-Type: application/json

{
  "user_id": "<uuid>",
  "workspace_id": null,
  "message": "Find emails that need reply"
}
```

If Microsoft is not connected, the backend returns:

```json
{
  "type": "connect_required",
  "provider": "microsoft",
  "connect_url": "/auth/microsoft/start",
  "message": "Please connect Microsoft 365 first."
}
```

## Supabase

Run `backend/app/db/schema.sql` in Supabase SQL editor before graph mode testing.

Never expose these outside the backend:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TOKEN_ENCRYPTION_KEY`
- Microsoft refresh tokens
- `INTERNAL_SERVICE_TOKEN`
