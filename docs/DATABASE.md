# Database

The initial migration is `supabase/migrations/20260724010000_initial_myos.sql`.

The life-management migration is `supabase/migrations/20260724020000_life_management.sql`.

The runtime compatibility migration is `supabase/migrations/20260724030000_supabase_runtime_columns.sql`.

The seed lifecycle migration is `supabase/migrations/20260808020000_seed_marker.sql`. It adds `profiles.myos_seeded_at` so starter data is imported only once per owner; deleting the last project no longer repopulates demo data. An explicit reset clears this marker before importing the starter set again.

The delivery and Agent observability migration is `supabase/migrations/20260809010000_delivery_and_agent_observability.sql`. It adds project milestones, project risks, and an append-only Agent work event timeline. Agent work items and reports also store heartbeat timestamps, execution evidence, changed files, test results, artifact links, blocked reasons, and failure counts.

## Core Tables

- `profiles`
- `projects`
- `project_tasks`
- `inbox_items`
- `files`
- `notes`
- `prompts`
- `prompt_runs`
- `automation_workflows`
- `automation_runs`
- `activity_logs`
- `tags`
- `entity_tags`
- `life_areas`
- `goals`
- `goal_projects`
- `goal_tasks`
- `habits`
- `habit_logs`
- `routines`
- `routine_steps`
- `routine_logs`
- `daily_checkins`
- `daily_reviews`
- `weekly_reviews`
- `external_integrations`
- `external_resource_links`
- `sync_logs`
- `project_milestones`
- `project_risks`
- `agent_work_events`

## Life Data Model

The relationship model is:

```text
life_areas -> goals -> projects -> project_tasks
goals -> habits
date -> daily_checkins -> daily_reviews
week -> weekly_reviews
```

Existing `projects` and `project_tasks` are reused. `project_tasks` gains goal, schedule, time, focus, recurrence, reminder, status, and privacy fields.

## RLS Strategy

All private tables enable RLS and use owner policies:

```sql
auth.uid() = user_id
```

`profiles` uses:

```sql
auth.uid() = id
```

## Runtime Repository

`src/server/data/supabase-store.ts` uses server-only Supabase access to read and mutate these tables when Supabase is configured. The current owner-cookie login is mapped to a Supabase `auth.users` row by:

- `SUPABASE_OWNER_USER_ID`, if configured
- otherwise, the owner email from the MyOS session

The browser never receives `SUPABASE_SERVICE_ROLE_KEY`.

If Supabase is not configured, `src/server/data/repository.ts` uses the local server repository so the app remains usable during local development.

## Local Supabase

Local Supabase is configured with:

- `supabase/config.toml` project id: `myos`
- API URL: `http://127.0.0.1:54331`
- Studio URL: `http://127.0.0.1:54323`
- Owner seed user: `owner@example.com`
- Owner seed user id: `00000000-0000-0000-0000-000000000001`

`supabase/seed.sql` only creates the local owner auth user. MyOS imports its starter module data through the server repository when the API is first read.

## Privacy Levels

The current schema uses `privacy_level` values:

- `normal`
- `sensitive`
- `vault`

Search and activity logs must avoid exposing high-sensitive full body fields.

## Storage Plan

The current local usable mode stores uploaded binaries under:

```text
work/uploads
```

Downloads go through the authenticated route:

```text
/api/files/download/[id]
```

Deletes go through the authenticated route:

```text
/api/files/delete/[id]
```

The `files` table/repository records:

- original filename
- file type
- MIME type
- display size
- storage path
- project/category

Placeholder/manual records are not shown as downloadable files. Only records with a real uploaded storage path expose a protected download URL.

In Supabase mode, uploaded binaries are stored in a private Supabase Storage bucket. The default bucket is:

```text
myos-files
```

It can be changed with:

```env
SUPABASE_STORAGE_BUCKET=
```

Object paths start with the configured owner id or owner email, for example:

```text
{user_id}/projects/{project_id}/{file_id}
```

Downloads go through the authenticated MyOS route and then use a short-lived signed Supabase Storage URL. Uploaded files are validated by size and stored with MIME metadata. Local development without Supabase continues to store binaries under `work/uploads`.

## Agent OS

Migration `20260807010000_agent_os.sql` extends `projects` with the project brief, technology stack, selected progress mode, and manual progress fallback. It adds three private owner-scoped tables:

- `project_agent_assignments`: agent role assignment per project.
- `agent_work_items`: scoped task, state, and progress reported by an Agent.
- `agent_reports`: append-only Agent status report, optionally related to one work item.

All three tables include `user_id`, use UUID primary keys, have indexes for project reads, and enable RLS with `auth.uid() = user_id` policies.

The delivery tables are owner-scoped as well:

- `project_milestones` stores planned, active, completed, and blocked delivery stages with progress and target dates.
- `project_risks` stores open, mitigated, and accepted delivery risks with severity and mitigation notes.
- `agent_work_events` stores status transitions and evidence messages, including heartbeat, blocked, completed, failed, and report events.

The new evidence columns are nullable so existing Agent records remain readable after migration. `changed_files` uses `text[]`; secrets and full credentials must never be written to evidence or event messages.

## Date Handling

Server-side aliases such as `today` and `tomorrow` are stored as calendar dates using `MYOS_TIME_ZONE`, which defaults to `Asia/Shanghai`. This avoids UTC date rollover errors for tasks, goals, habits, reviews, and check-ins.
