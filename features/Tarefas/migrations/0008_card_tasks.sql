-- card_tasks

create table if not exists public.card_tasks (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  description text,
  status text,
  deadline timestamptz,
  comment_id uuid references public.card_comments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  applicant_id uuid references public.applicants(id)
);

drop trigger if exists trg_card_tasks_set_updated_at on public.card_tasks;
create trigger trg_card_tasks_set_updated_at
before update on public.card_tasks
for each row execute function public.set_updated_at();

alter table public.card_tasks enable row level security;

-- Visibilidade: liberada para vendedores, analistas e gestores.
drop policy if exists tasks_select_access on public.card_tasks;
drop policy if exists tasks_select_roles on public.card_tasks;
create policy tasks_select_roles on public.card_tasks for select
  using (public.user_has_role(array['vendedor','analista','gestor']::user_role[]));

-- Inserção: mesmos papéis.
drop policy if exists tasks_insert_access on public.card_tasks;
drop policy if exists tasks_insert_roles on public.card_tasks;
create policy tasks_insert_roles on public.card_tasks for insert
  with check (public.user_has_role(array['vendedor','analista','gestor']::user_role[]));

-- Atualização: analistas/gestores em qualquer tarefa; vendedores apenas se criaram.
drop policy if exists tasks_update_access on public.card_tasks;
drop policy if exists tasks_update_roles on public.card_tasks;
create policy tasks_update_roles on public.card_tasks for update
  using (
    public.user_has_role(array['analista','gestor']::user_role[])
    or (
      public.user_has_role(array['vendedor']::user_role[])
      and created_by = auth.uid()
    )
  )
  with check (
    public.user_has_role(array['analista','gestor']::user_role[])
    or (
      public.user_has_role(array['vendedor']::user_role[])
      and created_by = auth.uid()
    )
  );

-- Delete: apenas gestor.
drop policy if exists tasks_delete_gestor on public.card_tasks;
create policy tasks_delete_gestor on public.card_tasks for delete
  using (public.user_has_role(array['gestor']::user_role[]));

