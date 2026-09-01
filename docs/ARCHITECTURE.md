# Architecture

## Layers

- `src/app`: Next.js routes, layouts, and page composition.
- `src/components`: reusable app shell, command, dashboard, and UI components.
- `src/features`: feature registries and feature-specific logic.
- `src/lib`: auth, data, Supabase, AI, automation, validation, and service helpers.
- `supabase/migrations`: database schema and RLS.

## Current Runtime

The current implementation uses a local owner cookie and authenticated Next.js route handlers. Core dashboard data is read from and written through `src/server/data/repository.ts`.

Repository selection is automatic:

- No Supabase env: use the local server repository at `work/server-data/myos-data.json`.
- Supabase env configured: use Supabase PostgreSQL through `src/server/data/supabase-store.ts`.

The life-management iteration extends local data with:

- Life areas
- Goals
- Upgraded tasks
- Habits and habit logs
- Routines, steps, and logs
- Daily check-ins
- Daily and weekly reviews

Rule summaries live in `src/features/life/calculations.ts` and never fabricate AI conclusions.

## Backend Data Flow

```text
Client UI
  -> /api/myos/data or /api/myos/actions
  -> owner session check
  -> Zod request validation
  -> repository selector
  -> local server file or Supabase tables
  -> sanitized activity records
```

The validated API routes call the selected repository. Client components continue to use `useMyOSData`, but that hook now calls the server APIs instead of persisting private data in browser `localStorage`.

## Target Runtime

Supabase PostgreSQL backs the core modules when configured. Supabase Storage backs private file uploads and signed downloads in Supabase mode. Supabase Auth should still replace local demo auth.

Google Calendar, Google Tasks, and Google Drive use server-side OAuth adapters documented in `docs/GOOGLE-INTEGRATION.md`. The browser only receives sanitized summaries and never receives Google tokens.

## Server Boundaries

- AI requests go through server-side provider adapters.
- n8n requests go through server-side automation adapters.
- Supabase Service Role Key must never be used in Client Components.

## Windows Local Agent

Cloud deployments cannot safely call the owner's local Ollama, VS Code, Keil, or filesystem directly. MyOS now includes a first read-only Windows local-agent path:

```text
Browser
  -> /api/local-agent/status
  -> owner session check
  -> server-side local-agent client
  -> http://127.0.0.1:43110 with bearer token
  -> local-agent/server.mjs
```

The first phase checks local-agent health, Ollama status, and allowlisted local projects. It does not execute local commands or mutate files.

## Agent OS

The Agent OS layer extends existing projects rather than introducing a separate tracker. The project detail page owns the user-facing execution console; all writes travel through the same Zod-validated `/api/myos/actions` route and repository selector as the rest of MyOS.

```text
Project detail UI or CLI/MCP client
  -> validated Agent OS action
  -> local file repository or Supabase repository
  -> assignment / work item / report records
  -> calculated project progress
```

The external Agent interface is intentionally restricted to reading project briefs, creating Agent work items, and reporting progress. `docs/AGENT-OS.md` documents the local CLI and stdio MCP server. It does not invoke local executables or expose arbitrary shell commands; that future capability belongs behind the separate allow-listed Windows local agent.

## Python Agent Runtime

The optional Python sidecar adds a language-neutral orchestration boundary
without replacing the Next.js application or repository layer:

```text
Agent CLI / MCP / future desktop adapter
  -> Python FastAPI runtime (127.0.0.1:43200, separate token)
  -> MyOS Agent API (MYOS_CLI_TOKEN)
  -> local repository or Supabase repository
  -> project context / work item / heartbeat / report / evidence
```

v0.2.0-alpha adds an allow-listed execution adapter inside the sidecar:

```text
Dispatch / Execution Center
  -> /api/executions (owner session, Zod)
  -> Python Runtime POST /executions
  -> PermissionGate + Git snapshot
  -> CodexAdapter argv (`codex exec --cd <allowlisted-dir>`)
  -> SSE logs / heartbeat / verification / report
```

Working directories come from `local-agent` `allowedProjects`. Commands use argv
arrays only. Codex credentials stay in Codex's own CLI store. Unsupported Agent
CLIs remain registered and are not launched.
