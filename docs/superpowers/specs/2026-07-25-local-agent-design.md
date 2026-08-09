# MyOS Windows Local Agent Design

## Context

MyOS is currently a private Next.js web app with authenticated server APIs, Supabase-ready persistence, AI provider adapters, n8n integration, file management, and an in-app configuration center.

The user wants MyOS to become more like a desktop app. The most valuable first step is not a full Electron/Tauri rewrite. The first step should connect MyOS to safe local computer capabilities: local files, VS Code projects, Ollama, and allowlisted scripts.

## Goal

Build a Windows Local Agent that runs on the owner's PC and exposes a small, safe set of local actions to MyOS.

The local agent should make MyOS able to:

- Check whether the local agent is running.
- Check whether Ollama is reachable.
- Open allowlisted local project folders.
- Open allowlisted projects in VS Code.
- Run allowlisted local scripts with structured input.
- Read metadata from allowlisted directories.
- Return structured results to MyOS.

## Non-Goals

The first version will not:

- Replace the current Next.js app.
- Package the whole product as Electron.
- Expose arbitrary shell command execution.
- Read the entire filesystem.
- Delete or move files.
- Open Keil, SolidWorks, or EasyEDA automatically.
- Run high-risk commands without a confirmation model.
- Expose the local agent to the public internet.

## Considered Approaches

### Approach A: Electron Shell First

Wrap the current web app in Electron and later add local integrations.

Pros:

- Feels like a desktop app quickly.
- Can be pinned to the taskbar.
- Familiar packaging model.

Cons:

- Does not immediately solve local automation.
- Adds packaging overhead before the core local capability is proven.
- Larger app size.

### Approach B: Tauri Shell First

Use Tauri for a lightweight desktop app.

Pros:

- Smaller and more security-focused than Electron.
- Good long-term fit for Windows desktop tooling.

Cons:

- More integration complexity with a Next.js server app.
- Rust-side permissions and packaging add friction before the product is stable.

### Approach C: Web MyOS plus Windows Local Agent

Keep the current web app and add a separate local helper process with a localhost API.

Pros:

- Fastest path to real local value.
- Does not disrupt current web architecture.
- Easier to test action-by-action.
- Can later be bundled into Electron or Tauri.

Cons:

- Requires running one local process during development.
- Needs careful authentication and allowlist design.

Recommended approach: **Approach C**.

## Phase 1 Scope

### Local Agent Runtime

Create a Node.js-based local agent under:

```text
local-agent/
```

It should start a localhost-only HTTP server on a configurable port, default:

```text
http://127.0.0.1:43110
```

The server must bind only to `127.0.0.1`, not `0.0.0.0`.

### Local Agent Configuration

Create:

```text
local-agent/agent.config.example.json
```

Example shape:

```json
{
  "port": 43110,
  "authToken": "replace-with-local-random-token",
  "allowedProjects": [
    {
      "id": "myos",
      "name": "MyOS",
      "path": "C:/Users/JOHO/Documents/Codex/2026-07-24/spreadsheets-plugin-spreadsheets-openai-primary-runtime",
      "vscode": true
    }
  ],
  "allowedScripts": [
    {
      "id": "hello",
      "name": "Hello Script",
      "command": "node",
      "args": ["scripts/hello.js"]
    }
  ],
  "ollamaBaseUrl": "http://127.0.0.1:11434"
}
```

The real config file should be ignored by git:

```text
local-agent/agent.config.json
```

### Local Agent API

All endpoints require:

```text
Authorization: Bearer <authToken>
```

Endpoints:

```text
GET /health
GET /ollama/status
GET /projects
POST /projects/:id/open-folder
POST /projects/:id/open-vscode
GET /directories/:projectId/entries
POST /scripts/:id/run
```

### MyOS Web Integration

Add runtime config fields:

```text
LOCAL_AGENT_BASE_URL
LOCAL_AGENT_TOKEN
```

These must be server-only variables. The browser must never receive the token.

Add server API routes:

```text
GET /api/local-agent/status
POST /api/local-agent/actions
```

The MyOS server calls the local agent. Browser components call only MyOS server APIs.

### UI

Add a page:

```text
/app/local-agent
```

The page should show:

- Local agent connection state.
- Ollama status.
- Allowed projects.
- Buttons to open folder or VS Code.
- Allowed scripts.
- Script run result.
- Clear unconfigured state when `LOCAL_AGENT_BASE_URL` or `LOCAL_AGENT_TOKEN` is missing.

Add navigation item:

```text
本地助手
```

Add configuration controls to Tools Center and Settings through the existing runtime config editor.

### Action Safety

Allowed:

- Open a configured folder path.
- Open VS Code for a configured folder path.
- Run a configured script with fixed command and fixed argument template.
- List files only inside configured project paths.
- Query Ollama status.

Forbidden:

- Arbitrary shell commands from the browser.
- User-provided executable paths.
- User-provided absolute paths outside allowlisted directories.
- Recursive delete or move operations.
- Returning secret values.
- Public network binding.

## Data Flow

```text
Browser
  -> MyOS authenticated API
  -> server-side local-agent client
  -> http://127.0.0.1:43110 with bearer token
  -> Windows Local Agent
  -> allowlisted local action
  -> structured result
```

## Error Handling

MyOS should distinguish:

- Local agent not configured.
- Local agent offline.
- Authentication failed.
- Action not allowed.
- Project not found.
- Script failed.
- Ollama offline.

The UI must not show fake success. Every local action should return a real success or real error.

## Testing Plan

Commands:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Manual checks:

- `/app/local-agent` redirects to login when unauthenticated.
- `/api/local-agent/status` returns 401 without session.
- Missing local agent env returns explicit unconfigured state.
- Wrong token returns authentication failure.
- `/health` works when the local agent is running.
- Opening VS Code works only for configured project IDs.
- Directory listing cannot escape the allowlisted project path.
- Script execution works only for configured script IDs.

## First Implementation Slice

Implement only:

1. `local-agent/` Node HTTP server.
2. Config example and gitignore rule for real local config.
3. `/health`, `/ollama/status`, `/projects`.
4. MyOS server client for local agent.
5. `/api/local-agent/status`.
6. `/app/local-agent` read-only status page.
7. Runtime config fields in the existing config editor.

Defer open-folder, VS Code launch, and script execution until the read-only status flow is stable.
