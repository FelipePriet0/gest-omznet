-- card_comments

create table if not exists public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  parent_id uuid references public.card_comments(id) on delete set null,
  author_id uuid not null references public.profiles(id),
  author_name text,
  author_role text,
  content text,
  level integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  thread_id text,
  is_thread_starter boolean,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  applicant_id uuid references public.applicants(id)
);

drop trigger if exists trg_card_comments_set_updated_at on public.card_comments;
create trigger trg_card_comments_set_updated_at
before update on public.card_comments
for each row execute function public.set_updated_at();

alter table public.card_comments enable row level security;

-- Visibilidade: liberada para vendedores, analistas e gestores.
drop policy if exists comments_select_access on public.card_comments;
drop policy if exists comments_select_roles on public.card_comments;
create policy comments_select_roles on public.card_comments for select
  using (public.user_has_role(array['vendedor','analista','gestor']::user_role[]));

-- Inserção: mesmos papéis.
drop policy if exists comments_insert_access on public.card_comments;
drop policy if exists comments_insert_roles on public.card_comments;
create policy comments_insert_roles on public.card_comments for insert
  with check (public.user_has_role(array['vendedor','analista','gestor']::user_role[]));

-- Update/Delete: own comment or gestor
drop policy if exists comments_update_own on public.card_comments;
create policy comments_update_own on public.card_comments for update
  using (author_id = auth.uid() or public.user_has_role(array['gestor']::user_role[]))
  with check (author_id = auth.uid() or public.user_has_role(array['gestor']::user_role[]));

drop policy if exists comments_delete_own on public.card_comments;
drop policy if exists comments_delete_author on public.card_comments;
create policy comments_delete_author on public.card_comments for delete
  using (author_id = auth.uid());

