-- inbox_notifications

create table if not exists public.inbox_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type notification_type not null,
  priority notification_priority,
  title text,
  body text,
  meta jsonb,
  task_id uuid references public.card_tasks(id) on delete set null,
  card_id uuid references public.kanban_cards(id) on delete set null,
  comment_id uuid references public.card_comments(id) on delete set null,
  link_url text,
  transient boolean,
  expires_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  applicant_id uuid references public.applicants(id)
);

alter table public.inbox_notifications enable row level security;

-- Only recipient can read, gestor can read all
drop policy if exists inbox_select_own_or_gestor on public.inbox_notifications;
create policy inbox_select_own_or_gestor on public.inbox_notifications for select
  using (user_id = auth.uid() or public.user_has_role(array['gestor']::user_role[]));

-- Inserts allowed (system or app) — no strict check here
drop policy if exists inbox_insert_all on public.inbox_notifications;
create policy inbox_insert_all on public.inbox_notifications for insert
  with check (true);

-- Allow recipient to update read_at; gestor too
drop policy if exists inbox_update_read on public.inbox_notifications;
create policy inbox_update_read on public.inbox_notifications for update
  using (user_id = auth.uid() or public.user_has_role(array['gestor']::user_role[]))
  with check (user_id = auth.uid() or public.user_has_role(array['gestor']::user_role[]));

