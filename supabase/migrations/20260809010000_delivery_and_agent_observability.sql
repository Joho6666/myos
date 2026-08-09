alter table public.agent_work_items add column if not exists last_heartbeat_at timestamptz;
alter table public.agent_work_items add column if not exists started_at timestamptz;
alter table public.agent_work_items add column if not exists completed_at timestamptz;
alter table public.agent_work_items add column if not exists blocked_reason text;
alter table public.agent_work_items add column if not exists result text;
alter table public.agent_work_items add column if not exists changed_files text[] not null default '{}'::text[];
alter table public.agent_work_items add column if not exists test_result text;
alter table public.agent_work_items add column if not exists artifact_url text;
alter table public.agent_work_items add column if not exists failure_count integer not null default 0 check (failure_count >= 0);

alter table public.agent_reports add column if not exists blocked_reason text;
alter table public.agent_reports add column if not exists changed_files text[] not null default '{}'::text[];
alter table public.agent_reports add column if not exists test_result text;
alter table public.agent_reports add column if not exists artifact_url text;

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'blocked')),
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_risks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'mitigated', 'accepted')),
  mitigation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_work_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  work_item_id uuid not null references public.agent_work_items(id) on delete cascade,
  agent_id text not null check (agent_id in ('codex', 'claude-code', 'opencode', 'hermes', 'openclaw')),
  event_type text not null check (event_type in ('queued', 'started', 'heartbeat', 'progress', 'blocked', 'completed', 'failed', 'report')),
  progress integer not null default 0 check (progress between 0 and 100),
  message text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists project_milestones_user_project_idx on public.project_milestones(user_id, project_id, target_date, updated_at desc);
create index if not exists project_risks_user_project_idx on public.project_risks(user_id, project_id, status, severity, updated_at desc);
create index if not exists agent_work_events_user_work_item_idx on public.agent_work_events(user_id, work_item_id, created_at desc);

alter table public.project_milestones enable row level security;
alter table public.project_risks enable row level security;
alter table public.agent_work_events enable row level security;

create policy "project_milestones owner access" on public.project_milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "project_risks owner access" on public.project_risks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agent_work_events owner access" on public.agent_work_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
