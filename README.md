# VRBOT (Professional Split)

This package is a **clean, production-friendly split** of the original project to avoid future build/deploy issues.

## Structure

- `apps/web` — Next.js UI only (no agent/backend code imported)
- `apps/api` — Backend / WS hub (server-side only)
- `apps/agent-windows` — Windows Agent (runs on Windows host / Windows VM)
- `apps/desktop` — Desktop app (Electron)
- `packages/shared` — shared types/contracts (optional)
- `packages/viking-rise-core` — game automation core (agent-side)

## Why this split?
Next.js **must not** directly import Windows/agent code. UI talks to API over HTTP.
This removes the recurring `Module not found` and build failures.

## Quick start (Web)

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

## Next steps
1. Implement real API proxy in `apps/web/app/api/agent/*` to call `apps/api`.
2. Run `apps/api` on server (Linux).
3. Run `apps/agent-windows` on Windows (local PC / Windows Server) and connect it to `apps/api`.

