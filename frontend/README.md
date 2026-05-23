# NexusHub Frontend

## 1. Architecture
Frontend → Backend only.
Frontend never calls MCP.
Frontend never stores Microsoft tokens.

## 2. Setup
```bash
npm install
```

## 3. Environment
Create a `.env.local` file based on `.env.example`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=NexusHub
NEXT_PUBLIC_APP_ENV=local
```

## 4. Run
```bash
npm run dev
```

## 5. Backend Requirements
Backend must expose:
- `/health`
- `/auth/session/me`
- `/auth/session/bootstrap`
- `/auth/microsoft/status`
- `/auth/microsoft/start`
- `/auth/microsoft/disconnect`
- `/agent/chat`
- `/approvals`

## 6. CORS
Backend must allow:
- origin `http://localhost:3000`
- credentials `true`

If auth/session calls fail in browser but work in Postman, check backend CORS and cookie settings.

## 7. State Management
- **TanStack Query**: server state
- **Zustand**: UI state only
- **React Hook Form + Zod**: forms
- **Sonner**: notifications

## 8. OAuth Flow
Frontend redirects to backend `/auth/microsoft/start`.
Backend handles Microsoft callback.
Backend redirects to `/settings?microsoft=connected`.

## 9. Streaming Future
Agent streaming can later use `/agent/chat/stream` through SSE. (Currently prepared as a placeholder in `hooks.ts`).

## 10. Tests
```bash
npm run test
npm run test:e2e
npm run typecheck
```
