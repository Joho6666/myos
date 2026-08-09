# Windows Local Agent

The first local-agent phase is implemented as a read-only localhost helper.

Files:

- `local-agent/server.mjs`
- `local-agent/agent.config.example.json`
- `local-agent/README.md`
- `src/lib/local-agent/client.ts`
- `src/app/api/local-agent/status/route.ts`
- `src/app/app/local-agent/page.tsx`

## Current Scope

Implemented:

- Local Node.js helper bound to `127.0.0.1`.
- Bearer-token protection for every local-agent endpoint.
- `GET /health`.
- `GET /ollama/status`.
- `GET /projects`.
- MyOS server-side proxy through `/api/local-agent/status`.
- Private UI page at `/app/local-agent`.
- A localhost-only MCP configuration writer exposed through the private Capability Center:
  - preview before modification;
  - project selection restricted to `allowedProjects`;
  - Claude Code project `.mcp.json` support;
  - OpenCode project `opencode.json` support;
  - timestamped backup created beside the local-agent configuration;
  - no secret is returned to the browser or written into target configuration files.
- Runtime config fields:
  - `LOCAL_AGENT_BASE_URL`
  - `LOCAL_AGENT_TOKEN`

Packaged into the Windows desktop app: Electron 启动时自动拉起本地助手，配置写在
`%APPDATA%\MyOS\agent.config.json`，`authToken` 每台机器随机生成，安装包内不含 token。
本地助手通过 `MYOS_AGENT_CONFIG` 环境变量定位该配置文件。详见 `docs/DESKTOP.md`。

Not implemented yet:

- Opening folders.
- Opening VS Code.
- Running scripts.
- File operations.
- Keil, SolidWorks, or EasyEDA automation.
- Automatic Codex, Hermes, or OpenClaw configuration. Their formats must be confirmed and added one by one to the local allowlist.

## Start

Copy the example config:

```bash
copy local-agent\agent.config.example.json local-agent\agent.config.json
```

Set a real random token in `local-agent/agent.config.json`, then set the same token in MyOS configuration:

```env
LOCAL_AGENT_BASE_URL=http://127.0.0.1:43110
LOCAL_AGENT_TOKEN=<same-token>
```

Start the local agent:

```bash
pnpm local-agent
```

Open:

```text
/app/local-agent
```

## Security Requirements

- No arbitrary command execution endpoint.
- Use allowlisted projects and future allowlisted actions.
- Bind only to `127.0.0.1`.
- Keep `LOCAL_AGENT_TOKEN` server-only.
- Never expose the local agent to the public internet.
- Do not return secret values.
- Require confirmation before any future risky local action.
- Never accept an arbitrary target path or arbitrary file content from the browser.
