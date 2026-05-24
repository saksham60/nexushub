# NexusHub Frontend

## Architecture

Frontend -> Backend only. The frontend never calls MCP and never stores Microsoft tokens.

## Environment

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=NexusHub
NEXT_PUBLIC_APP_ENV=local
```

On Vercel, set:

```env
NEXT_PUBLIC_BACKEND_URL=https://nexushub-2vof.onrender.com
NEXT_PUBLIC_APP_ENV=production
```

`NEXT_PUBLIC_API_BASE_URL` is supported as a fallback, but `NEXT_PUBLIC_BACKEND_URL` is preferred.

## Run

```bash
npm install
npm run dev
```

## Backend Routes Used

- `GET /health`
- `GET /auth/microsoft/status?user_id=...`
- `GET /auth/microsoft/start?user_id=...`
- `POST /auth/microsoft/disconnect?user_id=...`
- `POST /agent/chat`
- `GET /approvals?user_id=...`
- `POST /approvals/{approval_id}/approve?user_id=...`
- `POST /approvals/{approval_id}/reject?user_id=...`

Uploads and report creation are local UI stubs until backend endpoints are added.

## Validate

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
```
