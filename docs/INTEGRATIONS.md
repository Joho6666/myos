# Integrations

## AI Providers

Provider interface lives in `src/lib/ai/types.ts`. The AI workbench calls server-only providers through `/api/ai/status` and `/api/ai/chat`.

Supported providers:

- OpenAI via `OPENAI_API_KEY`
- OpenRouter via `OPENROUTER_API_KEY`
- Ollama via `OLLAMA_BASE_URL` in local development or future local agent

Unconfigured providers return explicit errors. The UI must not simulate successful AI output.

The AI workbench provides a status refresh button and a direct settings shortcut. After configuring a provider in Settings, the owner can refresh the AI page and immediately use the configured provider without guessing whether the server picked up the change.

The AI workbench disables chat execution when the selected provider is not configured. `/api/ai/chat` also checks provider readiness before attempting a chat call and returns a `503` unconfigured response instead of a generic runtime failure.

## n8n

Adapter lives in `src/lib/automations/n8n.ts`.

Required variables:

- `N8N_BASE_URL`
- `N8N_WEBHOOK_SECRET`
- `N8N_REQUEST_TIMEOUT_MS`

Browser code must not call private webhook URLs directly.

The automation workbench calls `/api/automations/run`, which forwards requests through the server-side n8n adapter and returns the real result or a clear unconfigured error.

The automation page also reads `/api/integrations/status` for n8n state, shows whether n8n is usable, and links directly to Settings for configuration.

The automation page disables workflow execution when n8n is not connected or the workflow path is empty. Missing `N8N_BASE_URL` or `N8N_WEBHOOK_SECRET` returns a clear `503` unconfigured response.

## Windows Local Agent

The first local-agent integration is read-only.

MyOS configuration fields:

- `LOCAL_AGENT_BASE_URL`
- `LOCAL_AGENT_TOKEN`

The browser calls only:

```text
/api/local-agent/status
```

The MyOS server then calls the local helper with the bearer token. The token is not returned to the browser.

Current returned data:

- Local agent health
- Ollama status
- Allowlisted local projects

Local command execution, opening folders, opening VS Code, and script execution are intentionally deferred until the read-only link is stable.

## Connection Dashboard

`/app/integrations` provides the global connection dashboard.

The page is now the MyOS external systems overview. It combines:

- Connection health for database, AI, n8n, GitHub, Gmail, and Notion.
- One-click refresh for all connected summaries.
- External signal triage from GitHub repositories/issues, unread or important Gmail messages, and recent Notion pages/databases.
- Import actions that turn external items into MyOS projects, tasks, inbox items, or knowledge notes.
- A setup checklist that shows which systems are already connected and which still need configuration.

The main dashboard (`/app`) also reads the same sanitized status endpoint and surfaces a compact "Global Connections" panel. This keeps the owner's first screen useful: opening MyOS immediately shows whether Supabase, GitHub, Gmail, Notion, AI, and n8n are connected, unconfigured, or failing, without requiring a separate dashboard visit.

`/api/integrations/status` performs server-side health checks for:

- Supabase via a protected read against `profiles`, not only environment-variable presence
- AI via provider model/tag endpoints for configured OpenAI, OpenRouter, or Ollama providers
- n8n via its `/healthz` endpoint and configured webhook variables
- GitHub via `GITHUB_TOKEN`
- Notion via `NOTION_TOKEN`
- Gmail via `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`

The API returns only sanitized status messages. It must never return tokens or secrets to the browser.

`/api/integrations/sync` exposes a sanitized connection snapshot and the latest sync log entries. `/api/integrations/status` records a sync result for each provider after health checks. These logs describe connectivity and refresh outcomes only; they do not implement bidirectional synchronization or store provider credentials.

### GitHub Summary

`/api/integrations/github/summary` reads a first usable GitHub overview through the server.

It requires:

- `GITHUB_TOKEN`

Returned data:

- GitHub profile summary
- Recently updated repositories
- Open issues assigned to the owner account
- Recently starred repositories

The endpoint never returns the token. If `GITHUB_TOKEN` is missing, it returns an explicit unconfigured error instead of fake data.

The dashboard can also turn GitHub data into MyOS work:

- Import a repository into Project Center through the existing `addProject` action.
- Convert an assigned issue into a MyOS task through the existing `addTask` action.
- Disable duplicate import buttons when a matching project or task already exists.

This keeps GitHub as a connected source while MyOS remains the private operating layer for daily planning.

### Notion Summary

`/api/integrations/notion/summary` reads recent Notion pages and databases through the server.

It requires:

- `NOTION_TOKEN`

Returned data:

- Recent pages and databases visible to the Notion integration
- Title
- Type
- URL
- Last edited time
- Archived state

The dashboard can import a Notion page or database into MyOS Knowledge through the existing `addNote` action. Duplicate note titles are disabled in the UI to avoid repeated imports.

### Gmail Summary

`/api/integrations/gmail/summary` reads recent Gmail inbox messages through the server.

It requires:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

Returned data:

- Recent inbox messages from the last 30 days
- Subject
- Sender
- Date header
- Snippet
- Unread and important state
- Direct Gmail URL
- Attachment count and the first few attachment names

The dashboard can import a message into MyOS Inbox through the existing `addInbox` action. Duplicate inbox titles are disabled in the UI to avoid repeated imports.

The dashboard can also import a Gmail message's attachments into MyOS File Center through `/api/integrations/gmail/attachments`.

Attachment import rules:

- The browser sends only the Gmail message id to the MyOS server.
- The server refreshes the Google access token and downloads attachments through Gmail API.
- Attachments are capped to 5 files per import and 25 MB total.
- Supabase mode stores binaries in the private `SUPABASE_STORAGE_BUCKET` bucket.
- Local fallback mode stores binaries under `work/uploads`.
- File records are written through the existing authenticated MyOS data repository.
- Download links use `/api/files/download/[id]`, so direct private Storage paths are not exposed as public files.

## In-App Configuration

`/app/settings` is the in-app configuration center.

`/app/tools` also embeds the same allowlisted runtime configuration editor so the owner can configure tool dependencies without leaving the Tools Center. This includes base app settings, Supabase, AI providers, n8n, GitHub, Gmail, and Notion. The embedded editor uses `/api/config/env`, so it keeps the same authentication, secret masking, validation, and `.env.local` persistence rules as Settings.

The settings page also includes a connection test panel. After saving or clearing a configuration field, MyOS refreshes `/api/integrations/status` so the owner can immediately see whether database, AI, n8n, GitHub, Gmail, and Notion are usable, unconfigured, or failing.

`/api/config/env` reads and updates an allowlisted set of runtime variables in `.env.local`.

Rules:

- Only authenticated MyOS owner sessions may read or update configuration.
- Secret values are never returned to the browser in plaintext.
- Secret fields show only configured state or a masked value.
- Empty values remove the matching key from `.env.local` and the current server process only through the clear action.
- Saving an already configured secret with an empty input keeps the existing value unchanged.
- Updates also mutate `process.env` for the current server process so status checks can refresh immediately.
- The endpoint is allowlist-only and must not become arbitrary file write access.
