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

## Local Development Setup

### Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 3001
```

### MCP HTTP local

```powershell
cd mcp-server
python -m pip install -r requirements.txt
$env:PYTHONPATH="src"
$env:MCP_TRANSPORT="streamable-http"
$env:NEXUSHUB_MODE="mock"
$env:MCP_HOST="127.0.0.1"
$env:MCP_PORT="8010"
python -m nexushub_mcp
```

### Frontend

```powershell
cd frontend
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

### Verification

```powershell
curl http://127.0.0.1:8010/health
curl http://127.0.0.1:3001/health
```

## Run with Docker Compose

Create env files:

```bash
cp backend/.env.example backend/.env
cp mcp-server/.env.example mcp-server/.env
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

## OpenAI LLM Routing

The backend can use LangGraph plus OpenAI to choose MCP tools. Keep the MCP server unchanged; the backend still calls MCP through `MCP_SIMPLE_TOOL_URL`.

Backend env:

```env
AGENT_MODE=langgraph
LLM_PROVIDER=openai
OPENAI_API_KEY=<secret>
OPENAI_MODEL=gpt-4.1
OPENAI_BASE_URL=https://api.openai.com/v1
```

## Supabase

Run `backend/app/db/schema.sql` in Supabase SQL editor before graph mode testing.

Never expose these outside the backend:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TOKEN_ENCRYPTION_KEY`
- Microsoft refresh tokens
- `INTERNAL_SERVICE_TOKEN`
