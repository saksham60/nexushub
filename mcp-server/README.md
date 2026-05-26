# NexusHub MCP Server

This is the MCP service for NexusHub. It is intentionally tool-only.

Important architecture rule:

- Frontend never calls MCP directly.
- Backend owns Microsoft OAuth, token refresh, token vault, sessions, approvals, audit logs, and agent orchestration.
- MCP owns tool definitions, mock mode, stdio for Claude Desktop, and backend-internal calls in graph mode.
- MCP does not store Microsoft tokens.

## Install

```bash
cd nexushub-mcp-server
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Windows PowerShell:

```powershell
cd nexushub-mcp-server
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

## Run Locally In Mock Mode

```bash
cp .env.example .env
NEXUSHUB_MODE=mock MCP_TRANSPORT=stdio python -m nexushub_mcp
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
$env:NEXUSHUB_MODE="mock"
$env:MCP_TRANSPORT="stdio"
python -m nexushub_mcp
```

For Claude Desktop stdio mode, Claude starts this command for you. Do not type into the terminal of a running stdio MCP server.

For local HTTP testing:

```bash
NEXUSHUB_MODE=mock MCP_TRANSPORT=streamable-http PORT=3001 python -m nexushub_mcp
```

Then connect an MCP client to:

```text
http://localhost:3001/mcp
```

## Claude Desktop Local Config

Build/install the package first, then use the Python executable from your virtual environment.

macOS/Linux example:

```json
{
  "mcpServers": {
    "nexushub": {
      "command": "/absolute/path/to/nexushub-mcp-server/.venv/bin/python",
      "args": ["-m", "nexushub_mcp"],
      "cwd": "/absolute/path/to/nexushub-mcp-server",
      "env": {
        "NEXUSHUB_MODE": "mock",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Windows example:

```json
{
  "mcpServers": {
    "nexushub": {
      "command": "D:\\absolute\\path\\to\\nexushub-mcp-server\\.venv\\Scripts\\python.exe",
      "args": ["-m", "nexushub_mcp"],
      "cwd": "D:\\absolute\\path\\to\\nexushub-mcp-server",
      "env": {
        "NEXUSHUB_MODE": "mock",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Dev version without editable install:

```json
{
  "mcpServers": {
    "nexushub-dev": {
      "command": "python",
      "args": ["-m", "nexushub_mcp"],
      "cwd": "/absolute/path/to/nexushub-mcp-server",
      "env": {
        "PYTHONPATH": "/absolute/path/to/nexushub-mcp-server/src",
        "NEXUSHUB_MODE": "mock",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

## Claude Code

Local stdio:

```bash
claude mcp add nexushub -- /absolute/path/to/nexushub-mcp-server/.venv/bin/python -m nexushub_mcp
```

Local or remote HTTP:

```bash
claude mcp add --transport http nexushub http://localhost:3001/mcp
```

After Render deployment:

```bash
claude mcp add --transport http nexushub https://YOUR-RENDER-SERVICE.onrender.com/mcp
```

If `NEXUSHUB_REMOTE_BEARER_TOKEN` is set on Render, configure your MCP client to send:

```text
Authorization: Bearer <token>
```

## Test Prompts For Claude

- "What NexusHub tools are available?"
- "Check my Microsoft auth status."
- "Find my emails that need reply."
- "Show my agenda for today."
- "Find urgent Teams mentions."
- "Analyze Q2_Budget.xlsx and build a report outline."
- "Draft a follow-up email to Alex about the Q2 budget, but do not send it."
- "List pending NexusHub approvals."
- "Execute this approval after I confirm it."

## Tools

Mail Pilot:

- `mail_find_needs_reply`
- `mail_find_awaiting_approval`
- `mail_summarize_thread`
- `mail_create_draft_reply`
- `mail_mark_as_read`

DayPilot:

- `calendar_get_today_agenda`
- `calendar_find_focus_blocks`
- `calendar_prepare_meeting_brief`

TeamSpace:

- `teams_get_urgent_mentions`
- `teams_get_meeting_summaries`
- `teams_extract_action_items`

Doc Insights:

- `docs_list_recent_files`
- `docs_analyze_uploaded_file`
- `docs_build_report`

Approvals:

- `approval_list_pending`
- `approval_execute`

Auth:

- `auth_get_status`
- `auth_get_login_url`

All tool responses follow this shape:

```json
{
  "ok": true,
  "source": "mock",
  "data": {}
}
```

Errors follow this shape:

```json
{
  "ok": false,
  "source": "microsoft_graph",
  "status": "authentication_required",
  "login_url": "http://127.0.0.1:3001/auth/microsoft/login",
  "message": "Please connect Microsoft first."
}
```

## Graph Mode

In graph mode, MCP calls the backend internal API. It does not perform OAuth or store Microsoft tokens.

Required env:

```env
NEXUSHUB_MODE=graph
MCP_TRANSPORT=streamable-http
MCP_HOST=0.0.0.0
MCP_PORT=8010
BACKEND_INTERNAL_URL=http://backend:3001
INTERNAL_SERVICE_TOKEN=<same-as-backend>
```

HTTP wrapper for backend calls:

```text
POST /tools/{tool_name}
```

## Render Deployment

This repo includes `render.yaml`. Render start command:

```bash
uvicorn nexushub_mcp.asgi:app --host 0.0.0.0 --port $PORT
```

Set these environment variables in Render:

```text
NEXUSHUB_MODE=graph
MCP_TRANSPORT=streamable-http
MCP_HTTP_PATH=/mcp
BACKEND_INTERNAL_URL=<backend-internal-url>
INTERNAL_SERVICE_TOKEN=<same-shared-secret-as-backend>
LOG_LEVEL=info
```

Recommended for any non-local deployment:

```text
NEXUSHUB_REMOTE_BEARER_TOKEN=<strong random token>
NEXUSHUB_ALLOWED_ORIGINS=https://claude.ai
```

Health check:

```text
https://YOUR-RENDER-SERVICE.onrender.com/health
```

MCP endpoint:

```text
https://YOUR-RENDER-SERVICE.onrender.com/mcp
```

## Safety Model

- The MVP never sends email directly.
- The MVP never posts to Teams directly.
- The MVP never deletes user data.
- `mail_create_draft_reply` and `mail_mark_as_read` create approval-required records.
- `approval_execute` only simulates execution for now.
- Logs include tool names and metadata only, never token values or full email bodies.

## Development

```bash
python -m pytest
python -m mypy src
python -m ruff check src tests
```

Syntax-only check without installing dependencies:

```bash
python -m compileall src tests
```

## TODO

- Supabase-backed encrypted token vault.
- User-scoped remote MCP auth instead of a shared bearer token.
- Real draft creation via Graph only after explicit approval semantics are finalized.
- Teams transcript retrieval when the tenant has the required APIs and permissions.
