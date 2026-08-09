# MyOS Tasks

## Phase 0 - Repository Check

- [x] Checked current directory contents.
- [x] Confirmed current directory was not a Git repository.
- [x] Confirmed no existing application source needed preservation.

## Phase 1 - Product And Architecture

- [x] Created `AGENTS.md`.
- [x] Created `TASKS.md`.
- [x] Created product, architecture, database, security, UI, local agent, integrations, testing, and roadmap docs.
- [x] Added `.env.example`.

## Phase 2 - Visual Design

- [x] Generated MyOS dashboard concept image.
- [x] Saved concept image to `outputs/myos-dashboard-concept.png`.
- [x] Implemented restrained dashboard visual system.

## Phase 3 - Foundation

- [x] Initialized Next.js App Router project structure.
- [x] Added TypeScript, Tailwind, ESLint, Vitest, and Next config.
- [x] Added local single-owner session protection.
- [x] Added private app shell, sidebar, topbar, theme toggle, and Ctrl+K command palette.

## Phase 4 - Core Modules

- [x] Added dashboard overview.
- [x] Added project center and project detail page.
- [x] Added project edit, favorite, archive, and delete actions.
- [x] Added universal inbox.
- [x] Added inbox edit, status update, archive, and delete actions.
- [x] Added prompt library.
- [x] Added prompt edit, favorite, and delete actions.
- [x] Added knowledge library.
- [x] Added knowledge edit, favorite, and delete actions.
- [x] Added file center.
- [x] Added task edit and delete actions.
- [x] Added global search.
- [x] Expanded global search to include tasks, inbox, automations, file storage status, and backup entries.
- [x] Added activity log.
- [x] Added settings page.
- [x] Replace browser `localStorage` core data with authenticated server APIs.
- [x] Replace file-backed server repository with Supabase-backed CRUD.
- [x] Restore automatic local server repository fallback so the app is usable before Supabase setup.
- [x] Implement local protected file upload and download.
- [x] Implement Supabase private Storage upload and signed downloads for production.

## Phase 5 - Integrations

- [x] Added AI Provider Adapter interface.
- [x] Added n8n server-side adapter.
- [x] Added tool registry mechanism.
- [x] Made the MCU timer calculator a real usable tool instead of a planned registry entry.
- [x] Fixed Tools Center Markdown preview to render Markdown instead of echoing raw text.
- [x] Replaced deprecated Base64 Unicode handling with UTF-8 safe encode/decode.
- [x] Added direct settings shortcuts and status refresh to AI and Automation pages.
- [x] Added in-app configuration center for Supabase, AI, n8n, GitHub, Gmail, and Notion environment variables.
- [x] Added in-app connection testing to Settings so configuration can be verified immediately.
- [x] Added connection dashboard for Supabase, AI, n8n, GitHub, Gmail, and Notion status.
- [x] Implemented live AI provider calls with clear unconfigured states.
- [x] Implemented n8n workflow execution UI with clear unconfigured states.
- [x] Added GitHub summary API and dashboard panel for profile, recent repositories, assigned issues, and starred repositories.
- [x] Add one-click import from GitHub repositories/issues into MyOS projects and tasks.
- [x] Add Notion database/page sync into MyOS knowledge.
- [x] Add Gmail recent message intake into MyOS inbox.
- [x] Upgrade connection dashboard into a global external-systems overview with one-click refresh, signal triage, and setup checklist.
- [x] Add Gmail attachment intake into MyOS private Storage.

## Phase 6 - Extended Modules

- [x] Added learning center skeleton.
- [x] Added learning task completion/delete and learning note delete actions.
- [x] Added engineering lab skeleton.
- [x] Added engineering project archive/delete actions.
- [x] Added business center skeleton.
- [x] Added business project done/archive/delete actions.
- [x] Added bookmarks skeleton.
- [x] Added bookmark edit/delete actions.

## Phase 7 - Verification

- [x] Run `pnpm install`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.
- [x] Browser-check desktop and mobile.
- [x] Add authenticated JSON data export from Settings.
- [x] Add authenticated JSON backup import/restore from Settings.

## Phase 8 - Life Management Increment

- [x] Read existing project rules and docs.
- [x] Checked existing source, migrations, and Git status.
- [x] Added life-management local data model.
- [x] Added life areas.
- [x] Added goals and goal detail.
- [x] Upgraded tasks with goal, project, schedule, priority, and today focus fields.
- [x] Added habits and habit logs.
- [x] Added routines and routine logs.
- [x] Added daily check-in.
- [x] Added daily review.
- [x] Added weekly review generated from real local data.
- [x] Upgraded `/app` into Today workspace and added `/app/today`.
- [x] Added life-management search coverage.
- [x] Added life-management Supabase migration and RLS.
- [x] Added PWA manifest, icon placeholder, and offline page.
- [x] Added Google integration design doc.
- [x] Run verification after life-management changes.

## Phase 9 - Backend Increment

- [x] Added authenticated MyOS data read API.
- [x] Added authenticated MyOS mutation API with Zod validation.
- [x] Added server-side file-backed data repository for local use.
- [x] Moved core app state away from browser `localStorage`.
- [x] Added pure backend action tests.
- [x] Replaced file-backed repository with Supabase CRUD.
- [x] Added repository selector for local usable mode and Supabase mode.
- [ ] Configure real Supabase credentials and apply migrations in a Supabase project.
- [x] Implement local protected file upload and download.
- [x] Implement Supabase private Storage upload and signed downloads for production.

## Phase 10 - Agent OS Increment

- [x] Added project briefs, technology stacks, and progress modes.
- [x] Added Agent registry, assignments, work items, and reports.
- [x] Added project Agent OS control console.
- [x] Added local-file and Supabase persistence for Agent OS records.
- [x] Added restricted token-protected CLI and stdio MCP server.
- [x] Added Agent OS safety and usage documentation.
- [x] Run final lint, tests, build, and local HTTP verification.

## Phase 11 - Simplified Workspace Upgrade

- [x] Reduce persistent navigation to Today, Projects, Inbox, Connections, and More.
- [x] Make the mobile navigation control usable.
- [x] Replace the overloaded dashboard with a visual focus workspace backed by real tasks, projects, Agent work, inbox, and connection data.
- [x] Upgrade quick project creation to featured templates plus optional advanced fields.
- [x] Run typecheck, lint, tests, production build, and local HTTP verification.

## Phase 12 - Themes and Mobile Usability

- [x] Add persisted light/dark preference and four selectable interface skins.
- [x] Add an accessible theme picker in the shared top bar.
- [x] Add a persistent mobile bottom navigation with an expandable More sheet.
- [x] Improve shared mobile touch targets and reserve content space above the bottom dock.
- [x] Run typecheck, lint, tests, production build, and local HTTP verification.

## Phase 13 - Project and Agent Operations

- [x] Add global Agent control center with real project-health, work-queue, blocker, report, and allocation views.
- [x] Add Agent control center to navigation, global search, and command actions.
- [x] Keep detailed Agent assignment and reporting inside the existing project workspace.
- [x] Run typecheck, lint, tests, production build, and local HTTP verification.

## Phase 14 - Agent Dispatch And Platform Catalog

- [x] Add a compact global Agent task dispatch flow backed by the authenticated action API.
- [x] Add reusable dispatch templates and clear local execution expectations.
- [x] Add a catalog of direct and MCP-ready platforms with non-fabricated connection states.
- [ ] Run current quality checks and browser verification.

## Phase 14 - Visual Work Map

- [x] Add an interactive project work tree using real project tasks and Agent work items.
- [x] Add real execution completion, state-distribution, project-load, and blocker visualizations.
- [x] Add the work map to navigation, global search, and command actions.
- [x] Run typecheck, lint, tests, production build, and local HTTP verification.

## Phase 15 - Project Intake and Portfolio Insights

- [x] Update template-based project creation to enter the newly created project immediately.
- [x] Add project portfolio funnel and category-distribution visualizations based on real records.
- [x] Run typecheck, lint, tests, production build, and local HTTP verification.

## Phase 16 - Capability Center

- [x] Add private server-side Skill discovery from the configured local Skill root.
- [x] Add MyOS Agent MCP configuration generation and safe copy support.
- [x] Add API configuration-status overview without exposing secrets.
- [x] Add Capability Center to navigation, search, and command actions.
- [x] Run typecheck, lint, and tests.

## Phase 17 - Local Agent MCP Application

- [x] Add authenticated Capability Center APIs for MCP preview and apply operations.
- [x] Restrict local writes to allowlisted projects and confirmed Claude Code/OpenCode schemas.
- [x] Create a backup before replacing an existing project configuration file.
- [x] Keep `MYOS_CLI_TOKEN` as an environment-variable reference, never a generated secret value.
- [x] Run typecheck, lint, tests, production build, protected route, and local startup checks.

## Phase 18 - Python Agent Runtime

- [x] Add a loopback-only FastAPI Agent Runtime with a separate runtime token.
- [x] Add MyOS project context, work-item creation, heartbeat, and report endpoints.
- [x] Register Codex, Claude Code, OpenCode, Hermes, and OpenClaw without launching executables.
- [x] Show Python Agent Runtime status in the Capability Center.
- [x] Document the optional sidecar and future fixed-executable desktop packaging boundary.
- [ ] Add one reviewed allow-listed Agent execution adapter after its CLI contract is verified.
- [ ] Run the full web and desktop verification after the runtime integration.
