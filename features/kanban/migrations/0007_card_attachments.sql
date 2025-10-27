-- card_attachments

create table if not exists public.card_attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  author_name text,
  author_role text,
  file_name text,
  file_path text,
  file_size bigint,
  file_type text,
  file_extension text,
  description text,
  comment_id uuid references public.card_comments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  applicant_id uuid references public.applicants(id)
);

drop trigger if exists trg_card_attachments_set_updated_at on public.card_attachments;
create trigger trg_card_attachments_set_updated_at
before update on public.card_attachments
for each row execute function public.set_updated_at();

alter table public.card_attachments enable row level security;

-- Visibility: users with access to related card or gestores
drop policy if exists attachments_select_access on public.card_attachments;
create policy attachments_select_access on public.card_attachments for select
  using (
    exists (
      select 1 from public.kanban_cards kc
      where kc.id = card_attachments.card_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    ) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );

-- Insert: any role if has access to card
drop policy if exists attachments_insert_access on public.card_attachments;
create policy attachments_insert_access on public.card_attachments for insert
  with check (
    exists (
      select 1 from public.kanban_cards kc
      where kc.id = card_attachments.card_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
  );

-- Update/Delete: author or gestor
drop policy if exists attachments_update_own on public.card_attachments;
create policy attachments_update_own on public.card_attachments for update
  using (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'))
  with check (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'));

drop policy if exists attachments_delete_own on public.card_attachments;
create policy attachments_delete_own on public.card_attachments for delete
  using (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'));

