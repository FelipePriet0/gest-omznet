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

-- Visibility: access to related card or gestor
drop policy if exists tasks_select_access on public.card_tasks;
create policy tasks_select_access on public.card_tasks for select
  using (
    exists (
      select 1 from public.kanban_cards kc
      where kc.id = card_tasks.card_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );

-- Insert: allowed for vendedor/analista/gestor when has access to card
drop policy if exists tasks_insert_access on public.card_tasks;
create policy tasks_insert_access on public.card_tasks for insert
  with check (
    exists (
      select 1 from public.kanban_cards kc
      where kc.id = card_tasks.card_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
  );

-- Update: creator or assignee or gestor
drop policy if exists tasks_update_access on public.card_tasks;
create policy tasks_update_access on public.card_tasks for update
  using (
    created_by = auth.uid() or assigned_to = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  )
  with check (
    created_by = auth.uid() or assigned_to = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );

-- Delete: only gestor
drop policy if exists tasks_delete_gestor on public.card_tasks;
create policy tasks_delete_gestor on public.card_tasks for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'));

