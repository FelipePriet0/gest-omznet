-- kanban_cards: cards for both Comercial and Análise

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  person_type person_type not null,
  area kanban_area not null default 'comercial',
  stage text not null,
  assignee_id uuid references public.profiles(id),
  received_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reanalysis_notes jsonb,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  deletion_reason text,
  cancel_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  comments text
);

drop trigger if exists trg_kanban_cards_set_updated_at on public.kanban_cards;
create trigger trg_kanban_cards_set_updated_at
before update on public.kanban_cards
for each row execute function public.set_updated_at();

alter table public.kanban_cards enable row level security;

-- RLS: cards visible/editable by assignee, creator, or gestores
drop policy if exists kanban_select_access on public.kanban_cards;
create policy kanban_select_access on public.kanban_cards for select
  using (
    assignee_id = auth.uid() or created_by = auth.uid() or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'
    )
  );

drop policy if exists kanban_update_access on public.kanban_cards;
create policy kanban_update_access on public.kanban_cards for update
  using (
    assignee_id = auth.uid() or created_by = auth.uid() or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'
    )
  )
  with check (
    assignee_id = auth.uid() or created_by = auth.uid() or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'
    )
  );

drop policy if exists kanban_insert_roles on public.kanban_cards;
create policy kanban_insert_roles on public.kanban_cards for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('vendedor','analista','gestor')));

