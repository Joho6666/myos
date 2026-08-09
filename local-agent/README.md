# MyOS Windows Local Agent

This is the Windows local agent for MyOS. It runs on the owner's Windows PC and exposes only localhost endpoints.

## Setup

1. Copy `agent.config.example.json` to `agent.config.json`.
2. Replace `authToken` with a local random token.
3. Add matching MyOS runtime config:

```env
LOCAL_AGENT_BASE_URL=http://127.0.0.1:43110
LOCAL_AGENT_TOKEN=<same-token>
```

4. Start the agent:

```bash
pnpm local-agent
```

## First Phase Endpoints

- `GET /health`
- `GET /ollama/status`
- `GET /projects`

## MCP Project Configuration

The local agent can safely add the MyOS MCP server to an allowlisted project from the Capability Center.

- Claude Code: writes or updates `<project>/.mcp.json`.
- OpenCode: writes or updates `<project>/opencode.json`.
- The operation only adds the `myos` MCP entry, creates a timestamped backup of an existing file, and uses environment-variable references instead of writing `MYOS_CLI_TOKEN` into the file.
- It requires a preview followed by the explicit confirmation button in MyOS.

Codex, Hermes, and OpenClaw remain template-only until their local configuration formats are added to the allowlisted writer.

Every endpoint requires:

```text
Authorization: Bearer <authToken>
```

The server binds only to `127.0.0.1`.
