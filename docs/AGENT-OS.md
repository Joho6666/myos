# MyOS Agent OS

MyOS Agent OS gives each project a shared operating context for local or external coding agents. It does not expose arbitrary shell execution.

## Project Control Layer

Each project can store:

- project brief and technology stack;
- progress calculated from Agent work items, or an explicitly chosen manual percentage;
- assigned Agent roles;
- scoped work items with state and percentage;
- append-only Agent reports.
- delivery milestones and project risks;
- execution evidence including heartbeat, changed files, test results, artifacts, and an event timeline.

Supported registry IDs are `codex`, `claude-code`, `opencode`, `hermes`, and `openclaw`. A registry ID is an integration label, not proof that the executable is installed or currently running.

## CLI

Set a private token in the local environment. Never commit it.

```env
MYOS_CLI_TOKEN=<long-random-local-token>
MYOS_URL=http://127.0.0.1:3000
# If MYOS_URL is omitted, MYOS_PORT or PORT selects the running dev port.
# MYOS_PORT=3002
```

With MyOS running, an Agent or terminal can use:

```bash
pnpm agent:cli -- list
pnpm agent:cli -- brief <project-id-or-name>
pnpm agent:cli -- work <project-id> --agent codex --title "实现项目看板" --instructions "先读取项目简报和现有任务"
pnpm agent:cli -- report <project-id> --agent codex --progress 60 --summary "完成数据模型，下一步实现 UI" --work <work-item-id> --status in_progress --test "pnpm typecheck 通过" --files "src/app/page.tsx,src/lib/data/models.ts"
```

The CLI can only read project data, create Agent work items, and submit reports. Browser login, database keys, and general system commands are not exposed through this path.

Reports may include `--status`, `--blocked`, `--test`, `--files`, and `--artifact`. These values are shown in the project's Delivery Console and are stored as evidence, not treated as proof that the Agent actually executed the claimed commands. The human owner remains responsible for reviewing changed files and test output.

## MCP

The stdio MCP server is:

```text
node <MyOS project path>/tools/myos-agent-mcp.mjs
```

Its environment must contain `MYOS_CLI_TOKEN` and optionally `MYOS_URL`. It exposes four tools:

- `myos_list_projects`
- `myos_get_project_brief`
- `myos_create_agent_work`
- `myos_report_agent_progress`

The project brief returned to an Agent includes milestones, open risks, assigned Agents, scoped work items, and recent execution events. This gives each Agent the same delivery context before it starts work.

Example MCP configuration:

```json
{
  "mcpServers": {
    "myos": {
      "command": "node",
      "args": ["C:\\path\\to\\myos\\tools\\myos-agent-mcp.mjs"],
      "env": {
        "MYOS_URL": "http://127.0.0.1:3000",
        "MYOS_CLI_TOKEN": "<long-random-local-token>"
      }
    }
  }
}
```

## Security Boundary

- The MCP server calls MyOS over localhost with a bearer token.
- The MyOS command endpoint accepts only the three Agent work/report actions.
- The existing Windows local agent remains separate and allow-list based.
- Future local execution must use explicit project and action allow-lists plus a user confirmation step.

## Local Agent Configuration Writer

When the Windows local agent is configured and a project is present in its `allowedProjects` list, MyOS can apply the MyOS MCP entry to that project after a preview and explicit confirmation. The current safe writers are:

- Claude Code: `.mcp.json` with `mcpServers.myos`;
- OpenCode: `opencode.json` with `mcp.servers.myos`.

Both configurations write the configured local MyOS address and reference `MYOS_CLI_TOKEN` from the local environment rather than embedding the token. Existing target files are copied to the local-agent `backups` directory before replacement. Codex, Hermes, and OpenClaw remain manual/template integrations until their formats are individually verified and allowlisted.
