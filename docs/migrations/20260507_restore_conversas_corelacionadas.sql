-- Emergency restore helper for Conversas Co-relacionadas.
-- Run only if rollback is required after 20260507_remove_conversas_corelacionadas.sql.

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

alter table public.card_comments enable row level security;

create policy comments_select_roles on public.card_comments
  for select using (public.user_has_role(array['vendedor','analista','gestor','instalador','leitor']));

create policy comments_insert_roles on public.card_comments
  for insert with check (public.user_has_role(array['vendedor','analista','gestor','instalador']));

create policy comments_update_own on public.card_comments
  for update using ((author_id = auth.uid()) and (not public.user_has_role(array['leitor'])))
  with check ((author_id = auth.uid()) and (not public.user_has_role(array['leitor'])));

create policy comments_delete_author on public.card_comments
  for delete using ((author_id = auth.uid()) and (not public.user_has_role(array['leitor'])));

alter table if exists public.card_attachments
  add column if not exists comment_id uuid references public.card_comments(id) on delete set null;

alter table if exists public.card_tasks
  add column if not exists comment_id uuid references public.card_comments(id) on delete set null;

alter table if exists public.inbox_notifications
  add column if not exists comment_id uuid references public.card_comments(id) on delete set null;

insert into public.card_comments
select * from backup_remove_conversas_20260507.card_comments
on conflict (id) do nothing;

update public.card_attachments target
set comment_id = source.comment_id
from backup_remove_conversas_20260507.card_attachments_with_comment source
where target.id = source.id;

update public.card_tasks target
set comment_id = source.comment_id
from backup_remove_conversas_20260507.card_tasks_with_comment source
where target.id = source.id;

update public.inbox_notifications target
set comment_id = source.comment_id
from backup_remove_conversas_20260507.inbox_notifications_with_comment source
where target.id = source.id;
