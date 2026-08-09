create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  status text not null default 'planned',
  category text not null default 'other',
  priority text not null default 'medium',
  github_url text,
  production_url text,
  local_path text,
  tech_stack text[] not null default '{}',
  next_action text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  priority text not null default 'medium',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  item_type text not null,
  content text,
  source text,
  status text not null default 'pending',
  category text,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  filename text not null,
  original_filename text not null,
  file_type text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null,
  category text,
  notes text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  summary text,
  body text not null default '',
  note_type text not null default 'note',
  source_url text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  content text not null,
  recommended_model text,
  favorite boolean not null default false,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  input jsonb not null default '{}',
  output text,
  model text,
  status text not null default 'success',
  created_at timestamptz not null default now()
);

create table if not exists public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text,
  webhook_path text,
  method text not null default 'POST',
  input_schema jsonb not null default '{}',
  enabled boolean not null default false,
  requires_confirmation boolean not null default true,
  timeout_ms integer not null default 30000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_id uuid references public.automation_workflows(id) on delete set null,
  input jsonb not null default '{}',
  output jsonb,
  status text not null,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  result text not null default 'success',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.entity_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_status_idx on public.projects(user_id, status, updated_at desc);
create index if not exists project_tasks_user_project_idx on public.project_tasks(user_id, project_id, status);
create index if not exists inbox_user_status_idx on public.inbox_items(user_id, status, created_at desc);
create index if not exists files_user_project_idx on public.files(user_id, project_id, updated_at desc);
create index if not exists notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index if not exists prompts_user_category_idx on public.prompts(user_id, category, updated_at desc);
create index if not exists activity_user_created_idx on public.activity_logs(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.inbox_items enable row level security;
alter table public.files enable row level security;
alter table public.notes enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_runs enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.automation_runs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.tags enable row level security;
alter table public.entity_tags enable row level security;

create policy "profiles owner access" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "projects owner access" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "project_tasks owner access" on public.project_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inbox owner access" on public.inbox_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "files owner access" on public.files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes owner access" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prompts owner access" on public.prompts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prompt_runs owner access" on public.prompt_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "automation_workflows owner access" on public.automation_workflows for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "automation_runs owner access" on public.automation_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity_logs owner access" on public.activity_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tags owner access" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "entity_tags owner access" on public.entity_tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
