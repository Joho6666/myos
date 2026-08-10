# Roadmap

## Phase 1

Complete runnable local MyOS prototype and secure database plan.

## Phase 2

Configure a real Supabase project, apply migrations, and replace local owner-cookie login with Supabase Auth. Supabase private Storage upload and signed downloads are already implemented.

## Phase 2b

Implement production CRUD for life areas, goals, tasks, habits, routines, daily check-ins, daily reviews, and weekly reviews.

## Phase 3

Implement live AI Provider Adapter with OpenAI, OpenRouter, DeepSeek, and Ollama. Keep local CLI Agents such as Codex CLI and GitHub Copilot CLI behind the local-agent allowlist and explicit execution adapters.

## Phase 4

Implement n8n workflow configuration, execution forms, confirmation, run logs, retry, and sanitized output viewer.

## Phase 5

Deepen learning center, engineering lab, business center, and bookmarks.

## Phase 6

Design Windows local agent for safe local project opening and Ollama access.

## Phase 6b

Agent OS delivery control is now available: project milestones, risk register, work-item evidence, heartbeat timestamps, Agent reports, and a project execution timeline. The next step is verified task execution and dependency-aware orchestration rather than more status-only fields.

External connection observability is also available through the connection dashboard and sanitized sync logs. Full incremental sync remains provider-specific and must be implemented per connector with explicit import, conflict, and retry rules.

## Phase 7

Implement reviewed encrypted vault storage for `vault` privacy-level data.

## Phase 8

Add the optional Python Agent Runtime for local project context, work-item
creation, heartbeats, and evidence reports. The next step is one verified
allow-listed execution adapter at a time, starting with a single Agent CLI;
desktop bundling should use a fixed Python executable rather than requiring a
system Python installation.
