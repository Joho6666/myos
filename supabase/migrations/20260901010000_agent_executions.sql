alter table public.projects add column if not exists preferred_agent text;
alter table public.projects add column if not exists fallback_agent text;
alter table public.projects add column if not exists permission_profile text not null default 'standard';
alter table public.projects add column if not exists max_runtime_minutes integer not null default 30;
alter table public.projects add column if not exists auto_retry integer not null default 2;
alter table public.projects add column if not exists verification jsonb not null default '{}'::jsonb;

alter table public.agent_work_events drop constraint if exists agent_work_events_event_type_check;
alter table public.agent_work_events add constraint agent_work_events_event_type_check
  check (event_type in ('queued', 'started', 'heartbeat', 'progress', 'blocked', 'completed', 'failed', 'report', 'log', 'approval', 'verify', 'rollback'));

create table if not exists public.agent_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_item_id uuid not null references public.agent_work_items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_name text not null default '',
  agent_id text not null,
  title text not null,
  instructions text not null default '',
  working_directory text not null default '',
  permission_profile text not null default 'standard' check (permission_profile in ('safe', 'standard', 'advanced')),
  status text not null check (status in ('queued', 'preparing', 'running', 'waiting_for_approval', 'verifying', 'completed', 'failed', 'cancelled')),
  phase text not null default 'queued',
  error text,
  latest_action text,
  retry_count integer not null default 0,
  files_changed integer not null default 0,
  additions integer not null default 0,
  deletions integer not null default 0,
  accepted boolean,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_executions_user_updated_idx on public.agent_executions(user_id, updated_at desc);
alter table public.agent_executions enable row level security;
create policy "agent_executions owner access" on public.agent_executions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
