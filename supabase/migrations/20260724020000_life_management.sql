alter table public.projects add column if not exists privacy_level text not null default 'normal';
alter table public.project_tasks add column if not exists goal_id uuid;
alter table public.project_tasks add column if not exists planned_date date;
alter table public.project_tasks add column if not exists due_date date;
alter table public.project_tasks add column if not exists estimated_minutes integer;
alter table public.project_tasks add column if not exists actual_minutes integer;
alter table public.project_tasks add column if not exists today_focus boolean not null default false;
alter table public.project_tasks add column if not exists recurrence_rule text;
alter table public.project_tasks add column if not exists reminder_at timestamptz;
alter table public.project_tasks add column if not exists privacy_level text not null default 'normal';
alter table public.inbox_items add column if not exists privacy_level text not null default 'normal';
alter table public.files add column if not exists privacy_level text not null default 'normal';
alter table public.notes add column if not exists privacy_level text not null default 'normal';
alter table public.prompts add column if not exists privacy_level text not null default 'normal';

create table if not exists public.life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  display_order integer not null default 0,
  status text not null default 'active',
  privacy_level text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  description text,
  motivation text,
  success_criteria text,
  status text not null default 'idea',
  priority text not null default 'medium',
  start_date date,
  target_date date,
  manual_progress integer not null default 0 check (manual_progress >= 0 and manual_progress <= 100),
  progress_mode text not null default 'manual',
  next_action text,
  abandon_conditions text,
  privacy_level text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.project_tasks
  add constraint project_tasks_goal_id_fkey foreign key (goal_id) references public.goals(id) on delete set null;

create table if not exists public.goal_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, goal_id, project_id)
);

create table if not exists public.goal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, goal_id, task_id)
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  name text not null,
  description text,
  frequency_type text not null default 'daily',
  recurrence_rule text,
  target_value numeric,
  unit text,
  reminder_time time,
  status text not null default 'active',
  privacy_level text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  status text not null,
  value numeric,
  note text,
  privacy_level text not null default 'normal',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, log_date)
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid references public.life_areas(id) on delete set null,
  name text not null,
  description text,
  schedule_type text not null default 'daily',
  recurrence_rule text,
  status text not null default 'active',
  privacy_level text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  title text not null,
  display_order integer not null default 0,
  estimated_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  log_date date not null,
  status text not null,
  completed_step_ids uuid[] not null default '{}',
  note text,
  privacy_level text not null default 'normal',
  created_at timestamptz not null default now(),
  unique (user_id, routine_id, log_date)
);

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  sleep_at time,
  wake_at time,
  sleep_hours numeric,
  sleep_quality integer,
  energy integer,
  mood integer,
  stress integer,
  exercise text,
  study_minutes integer,
  work_minutes integer,
  note text,
  privacy_level text not null default 'sensitive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  completed text,
  problems text,
  state text,
  tomorrow_focus text,
  privacy_level text not null default 'sensitive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  completed_task_ids uuid[] not null default '{}',
  unfinished_task_ids uuid[] not null default '{}',
  project_changes text,
  goal_progress text,
  habit_completion_rate integer not null default 0,
  study_minutes integer not null default 0,
  sleep_trend text,
  mood_trend text,
  spending_summary_placeholder text,
  next_week_focus text[] not null default '{}',
  privacy_level text not null default 'sensitive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.external_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  scopes text[] not null default '{}',
  status text not null default 'not_configured',
  token_ref text,
  last_synced_at timestamptz,
  sync_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.external_resource_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid references public.external_integrations(id) on delete cascade,
  local_entity_type text not null,
  local_entity_id uuid not null,
  external_resource_type text not null,
  external_id text not null,
  sync_direction text not null default 'bidirectional',
  sync_status text not null default 'linked',
  last_synced_at timestamptz,
  remote_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, integration_id, external_id)
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid references public.external_integrations(id) on delete set null,
  entity_type text,
  entity_id uuid,
  direction text not null,
  status text not null,
  message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists life_areas_user_order_idx on public.life_areas(user_id, display_order);
create index if not exists goals_user_area_status_idx on public.goals(user_id, life_area_id, status, target_date);
create index if not exists goal_projects_user_goal_idx on public.goal_projects(user_id, goal_id);
create index if not exists goal_tasks_user_goal_idx on public.goal_tasks(user_id, goal_id);
create index if not exists project_tasks_user_goal_idx on public.project_tasks(user_id, goal_id, planned_date, today_focus);
create index if not exists habits_user_goal_status_idx on public.habits(user_id, goal_id, status);
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, log_date);
create index if not exists routines_user_status_idx on public.routines(user_id, status);
create index if not exists routine_steps_user_routine_idx on public.routine_steps(user_id, routine_id, display_order);
create index if not exists routine_logs_user_date_idx on public.routine_logs(user_id, log_date);
create index if not exists daily_checkins_user_date_idx on public.daily_checkins(user_id, checkin_date);
create index if not exists daily_reviews_user_date_idx on public.daily_reviews(user_id, review_date);
create index if not exists weekly_reviews_user_week_idx on public.weekly_reviews(user_id, week_start);
create index if not exists external_links_user_entity_idx on public.external_resource_links(user_id, local_entity_type, local_entity_id);
create index if not exists sync_logs_user_created_idx on public.sync_logs(user_id, created_at desc);

alter table public.life_areas enable row level security;
alter table public.goals enable row level security;
alter table public.goal_projects enable row level security;
alter table public.goal_tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.routines enable row level security;
alter table public.routine_steps enable row level security;
alter table public.routine_logs enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.external_integrations enable row level security;
alter table public.external_resource_links enable row level security;
alter table public.sync_logs enable row level security;

create policy "life_areas owner access" on public.life_areas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals owner access" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goal_projects owner access" on public.goal_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goal_tasks owner access" on public.goal_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits owner access" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_logs owner access" on public.habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routines owner access" on public.routines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routine_steps owner access" on public.routine_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routine_logs owner access" on public.routine_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_checkins owner access" on public.daily_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_reviews owner access" on public.daily_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_reviews owner access" on public.weekly_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "external_integrations owner access" on public.external_integrations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "external_resource_links owner access" on public.external_resource_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sync_logs owner access" on public.sync_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
