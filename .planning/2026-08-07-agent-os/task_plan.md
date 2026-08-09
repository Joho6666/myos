# Agent OS Upgrade Plan

## Goal

Turn MyOS projects into agent-operable workspaces. Each project should expose its real progress, technology stack, brief, assigned agents, execution work items, and reports. The architecture must leave safe CLI and MCP control boundaries for future Codex, Claude Code, OpenCode, Hermes, and OpenClaw integrations.

## Scope

- [x] Inspect existing project/data architecture and identify extension points.
- [x] Add an Agent OS domain model and local/Supabase persistence path.
- [x] Build a project agent-control workspace with progress, stack, assignments, work items, and reports.
- [x] Add safe agent registry and local CLI/MCP contract documentation.
- [x] Add a minimal local CLI command surface for listing projects and reporting progress.
- [x] Verify typecheck, lint, tests, build, and key UI flows.

## Non-goals

- No unrestricted shell execution from the browser.
- No fabricated agent execution or progress.
- No storage of third-party API keys in the client.
- No automatic installation or remote control of Codex, Claude Code, OpenCode, Hermes, or OpenClaw in this phase.

## Decisions

- The first release is an orchestrator and reporting layer; external agents remain explicit local integrations.
- Project progress is derived from tracked work items when available, with a manually editable fallback.
- Agent reports are append-only work records, not arbitrary system logs.
- CLI/MCP access is read/write scoped to the authenticated owner and uses the same server-side domain actions.

## Phase 11 - Simplified Workspace Upgrade

- [x] Audit current navigation, dashboard, and project creation flow.
- [x] Reduce primary navigation to high-frequency workflows and move secondary modules into a compact More menu.
- [x] Build a visual focus dashboard with real project, task, and Agent OS progress.
- [x] Upgrade project templates into a guided one-step creation flow.
- [x] Verify desktop and mobile layouts plus typecheck, lint, tests, and build.

### Simplification Decisions

- Primary navigation: Today, Projects, Inbox, Connections, More.
- Low-frequency pages remain available but are not permanently competing for attention.
- Templates create useful defaults; advanced fields remain optional and contextual.
- Dashboard visuals only summarize real MyOS records and never invent activity or progress.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Dynamic route file was not read with PowerShell because `[id]` was treated as a wildcard. | 1 | Use `-LiteralPath` for dynamic route files. |
| Combined ripgrep expression was malformed during Supabase-store inspection. | 1 | Use plain fixed-string searches in separate commands. |
| Typecheck rejected broad string `agentId` fields in client hook helper signatures. | 1 | Use the same known-agent union as the validated action schema. |
| Isolated development server did not start because pnpm forwarded a literal `--` to Next. | 1 | Start Next directly with `pnpm exec next dev -p 3002`. |
| Development server returned a Webpack runtime 500 after a concurrent production build rewrote `.next`. | 1 | Stop only the isolated MyOS dev process and restart it after the build completes. |
| Expected mobile navigation component did not exist during source inspection. | 1 | Inspect the actual private layout and navigation configuration instead. |
| The first development-server restart command did not start Next on port 3002. | 1 | Start Next directly through `pnpm exec next dev -p 3002`; the isolated server then started successfully. |

## Phase 12 - Themes and Mobile Usability

- [x] Audit current theme state, navigation, and responsive shell behavior.
- [x] Add persisted visual skin selection with accessible light and dark modes.
- [x] Add a mobile bottom navigation for high-frequency destinations.
- [x] Improve responsive density and touch targets across the shared shell.
- [x] Verify typecheck, lint, tests, build, and local server availability.

## Phase 13 - Project and Agent Operations

- [x] Audit the existing project Agent OS data and interaction surfaces.
- [x] Add a consolidated Agent control center based on real assignments, work items, reports, and project health.
- [x] Expose the control center through navigation, search, and the command palette.
- [x] Improve project detail context so projects present a concise health signal before detailed controls.
- [x] Verify typecheck, lint, tests, build, and local runtime.

## Phase 14 - Visual Work Map

- [x] Research current open-source dashboard, workflow graph, and contribution-heatmap patterns.
- [x] Add a visual work-map page using real MyOS project, task, and Agent data.
- [x] Add interactive project work trees with direct links to actionable records.
- [x] Add compact progress and execution-status visualizations without fabricated time-series data.
- [x] Expose the work map in navigation, search, and command actions; verify quality gates.

## Phase 15 - Project Intake and Portfolio Insights

- [x] Research template-first project creation and project insight patterns.
- [x] Make template project creation create and enter the new project in one flow.
- [x] Add real portfolio funnel and category distribution visualizations to the work map.
- [x] Verify typecheck, lint, tests, build, and local runtime.

## Phase 16 - Capability Center

- [x] Audit existing MCP, local Skill, and API configuration boundaries.
- [x] Add a private Capability Center with Skill discovery, MCP config generation, and API status.
- [x] Expose it through navigation, search, and command actions.
- [x] Verify typecheck, lint, and tests.

## Phase 17 - Local Agent MCP Application

- [x] Extend the localhost local-agent with an allowlisted MCP preview/apply protocol.
- [x] Add Claude Code and OpenCode project configuration writers with atomic write and backup.
- [x] Connect the private Capability Center to the server-side proxy with explicit confirmation.
- [x] Verify lint, tests, production build, and the active local runtime.

## Phase 18 - Two-Level Information Architecture

- [x] Consolidate the flat module navigation into five work-context directories.
- [x] Make each directory expand into a focused second-level destination list.
- [x] Apply the same directory structure to compact mobile navigation.
- [x] Verify typecheck, lint, tests, and the active local interface.

## Phase 19 - Desktop Focus Window

- [x] Add a dedicated, always-on-top Electron focus window with a safe IPC surface.
- [x] Add desktop top-bar and tray entry points; keep browser mode free of fake desktop controls.
- [x] Add a private compact focus route backed by real tasks and active projects.
- [x] Verify Electron syntax, app build, and local route availability.

## Phase 20 - Native Desktop Polish

- [x] Persist main-window geometry and maximized state in the MyOS data directory.
- [x] Add a global focus-window shortcut and desktop-only controls in Settings.
- [x] Build fresh Windows setup and portable artifacts.
- [x] Launch the portable desktop application and restore the browser development service.

## Phase 21 - Agent Dispatch And Platform Catalog

- [x] Add a global queued-work dispatch form for projects and registered Agents.
- [x] Keep dispatch persistence tied to the authenticated MyOS action API.
- [x] Add a connection catalog that distinguishes direct integrations from MCP-ready platforms.
- [x] Verify typecheck, lint, tests, build, and protected runtime behavior.
