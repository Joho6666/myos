# MyOS Python Agent Runtime

The Python Agent Runtime is a local orchestration sidecar for MyOS. It gives
CLI, MCP, and future desktop adapters one small HTTP surface for reading a
project brief, creating Agent work, sending heartbeats, and submitting
progress reports.

Phase 1 deliberately does not execute arbitrary shell commands or launch
Codex, Claude Code, OpenCode, Hermes, or OpenClaw. Those names are registered
as controlled Agent targets, while execution remains manual until each target
has an explicit allow-listed adapter and confirmation flow.

## Start locally

From the MyOS project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r python-agent\requirements.txt

$env:MYOS_URL = "http://127.0.0.1:3002"
$env:MYOS_CLI_TOKEN = "your-existing-myos-cli-token"
$env:MYOS_PYTHON_AGENT_TOKEN = "another-long-random-local-token"
python python-agent\server.py
```

The runtime listens on `127.0.0.1:43200` by default. Configure another local
port with `PYTHON_AGENT_PORT` if needed.

The runtime token is separate from `MYOS_CLI_TOKEN`. Never put either token in
browser code, committed files, MCP output, or screenshots.

## Endpoints

All endpoints except `/health` require:

```text
Authorization: Bearer <MYOS_PYTHON_AGENT_TOKEN>
```

- `GET /health` - local process and configuration status, without secrets.
- `GET /runtime` - registered Agent targets and execution mode.
- `GET /projects` - project list from the MyOS Agent API.
- `GET /projects/{project_id}/brief` - project context for an Agent.
- `GET /jobs?projectId={project_id}` - work items and evidence for a project.
- `POST /jobs` - create a MyOS Agent work item.
- `POST /jobs/{work_item_id}/heartbeat` - append a progress heartbeat.
- `POST /jobs/{work_item_id}/report` - append a structured Agent report.

Example job request:

```json
{
  "projectId": "project-id",
  "agentId": "codex",
  "title": "Implement the project dashboard",
  "instructions": "Read the project brief before changing files."
}
```

Registered Agent targets also include Claude Code, OpenCode, GitHub Copilot CLI,
Hermes, and OpenClaw. They are manual targets in Phase 1: the runtime records
project context, work items, heartbeats, and reports without launching an
arbitrary local process.

## Desktop boundary

The current Electron app still starts the Next.js server and the Node local
agent. It does not bundle a Python interpreter yet, so the Python runtime is
an optional local sidecar during Phase 1. The safe packaging path for a later
desktop release is to build this service into a fixed PyInstaller executable,
then let Electron spawn that executable with the same loopback and token
boundary. Do not make the installed app depend on a system-wide Python
installation without an explicit packaging step.
