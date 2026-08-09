alter table public.projects add column if not exists goal_id uuid references public.goals(id) on delete set null;

alter table public.project_tasks add column if not exists project_name text;
alter table public.project_tasks add column if not exists due_text text;

alter table public.files add column if not exists display_size text;

alter table public.automation_workflows add column if not exists status text not null default 'not_configured';
alter table public.automation_workflows add column if not exists last_run_label text not null default '尚未运行';
alter table public.automation_workflows add column if not exists next_run_label text not null default '配置后可用';

create index if not exists projects_user_goal_idx on public.projects(user_id, goal_id, updated_at desc);
