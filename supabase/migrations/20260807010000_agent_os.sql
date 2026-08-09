alter table public.projects add column if not exists agent_summary text;
alter table public.projects add column if not exists agent_progress_mode text not null default 'agent_work';
alter table public.projects add column if not exists agent_manual_progress integer not null default 0 check (agent_manual_progress between 0 and 100);

create table if not exists public.project_agent_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id text not null check (agent_id in ('codex', 'claude-code', 'opencode', 'hermes', 'openclaw')),
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, project_id, agent_id)
);

create table if not exists public.agent_work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id text not null check (agent_id in ('codex', 'claude-code', 'opencode', 'hermes', 'openclaw')),
  title text not null,
  instructions text not null default '',
  status text not null default 'queued' check (status in ('queued', 'in_progress', 'blocked', 'completed')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  work_item_id uuid references public.agent_work_items(id) on delete set null,
  agent_id text not null check (agent_id in ('codex', 'claude-code', 'opencode', 'hermes', 'openclaw')),
  summary text not null,
  progress integer not null check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists project_agent_assignments_user_project_idx on public.project_agent_assignments(user_id, project_id);
create index if not exists agent_work_items_user_project_idx on public.agent_work_items(user_id, project_id, updated_at desc);
create index if not exists agent_reports_user_project_idx on public.agent_reports(user_id, project_id, created_at desc);

alter table public.project_agent_assignments enable row level security;
alter table public.agent_work_items enable row level security;
alter table public.agent_reports enable row level security;

create policy "project_agent_assignments owner access" on public.project_agent_assignments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agent_work_items owner access" on public.agent_work_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agent_reports owner access" on public.agent_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
