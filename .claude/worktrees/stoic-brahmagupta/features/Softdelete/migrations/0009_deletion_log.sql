-- deletion_log

create table if not exists public.deletion_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  deleted_by uuid references public.profiles(id),
  deleted_at timestamptz not null default now(),
  record_snapshot jsonb,
  reason text
);

alter table public.deletion_log enable row level security;

-- Only gestores can read; inserts typically via triggers (to be added per table later)
drop policy if exists deletion_log_select_gestor on public.deletion_log;
create policy deletion_log_select_gestor on public.deletion_log for select
  using (public.user_has_role(array['gestor']::user_role[]));

drop policy if exists deletion_log_insert_all on public.deletion_log;
create policy deletion_log_insert_all on public.deletion_log for insert
  with check (true);

