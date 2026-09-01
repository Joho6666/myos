-- Offline-first synchronization metadata for the MyOS core entities.
alter table public.projects add column if not exists sync_revision bigint not null default 1;
alter table public.project_tasks add column if not exists sync_revision bigint not null default 1;
alter table public.inbox_items add column if not exists sync_revision bigint not null default 1;

create table if not exists public.myos_sync_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null check (entity in ('project', 'task', 'inbox')),
  entity_id uuid not null,
  operation text not null check (operation in ('upsert', 'delete')),
  row_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists myos_sync_events_user_id_id_idx on public.myos_sync_events(user_id, id);

create table if not exists public.myos_sync_operations (
  operation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz not null default now()
);

alter table public.myos_sync_events enable row level security;
alter table public.myos_sync_operations enable row level security;
create policy "sync events owner access" on public.myos_sync_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sync operations owner access" on public.myos_sync_operations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.myos_record_sync_event() returns trigger language plpgsql security definer set search_path = public as $$
declare
  entity_name text;
  record_data jsonb;
begin
  entity_name := case TG_TABLE_NAME when 'projects' then 'project' when 'project_tasks' then 'task' when 'inbox_items' then 'inbox' end;
  if TG_OP = 'DELETE' then
    insert into public.myos_sync_events(user_id, entity, entity_id, operation, row_data) values (OLD.user_id, entity_name, OLD.id, 'delete', to_jsonb(OLD));
    return OLD;
  end if;
  NEW.sync_revision := coalesce(OLD.sync_revision, 0) + 1;
  record_data := to_jsonb(NEW);
  insert into public.myos_sync_events(user_id, entity, entity_id, operation, row_data) values (NEW.user_id, entity_name, NEW.id, 'upsert', record_data);
  return NEW;
end;
$$;

drop trigger if exists myos_projects_sync_event on public.projects;
create trigger myos_projects_sync_event before insert or update or delete on public.projects for each row execute function public.myos_record_sync_event();
drop trigger if exists myos_tasks_sync_event on public.project_tasks;
create trigger myos_tasks_sync_event before insert or update or delete on public.project_tasks for each row execute function public.myos_record_sync_event();
drop trigger if exists myos_inbox_sync_event on public.inbox_items;
create trigger myos_inbox_sync_event before insert or update or delete on public.inbox_items for each row execute function public.myos_record_sync_event();
