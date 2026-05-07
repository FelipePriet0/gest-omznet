-- Remove Conversas Co-relacionadas after the web app no longer reads/writes card_comments.
-- Backup schema expected: backup_remove_conversas_20260507.

drop trigger if exists profiles_propagate_role_to_comments on public.profiles;

drop function if exists public.inbox_notify_comment_mentions();
drop function if exists public.inbox_notify_comment_replies();
drop function if exists public.inbox_notify_mentions();
drop function if exists public.propagate_profile_role_to_comments();
drop function if exists public.set_comment_author_role();

drop function if exists public.list_inbox_notifications();

create function public.list_inbox_notifications()
returns table(
  id uuid,
  user_id uuid,
  type text,
  priority text,
  author_name text,
  primary_name text,
  content text,
  link_url text,
  expires_at timestamptz,
  read_at timestamptz,
  created_at timestamptz,
  card_id uuid,
  applicant_id uuid
)
language sql
security definer
set search_path to 'public'
as $function$
  select
    n.id,
    n.user_id,
    n.type::text,
    n.priority::text,
    coalesce(
      nullif(n.meta->>'author_name', ''),
      case when (n.meta ? 'note_id') then
        nullif((
          select elem->>'author_name'
          from jsonb_array_elements(kc.reanalysis_notes) elem
          where (elem->>'id')::uuid = (n.meta->>'note_id')::uuid
          limit 1
        ), '')
      end,
      case when (n.meta ? 'note_id') then
        (
          select p.full_name
          from jsonb_array_elements(kc.reanalysis_notes) elem
          join public.profiles p on p.id = (elem->>'author_id')::uuid
          where (elem->>'id')::uuid = (n.meta->>'note_id')::uuid
          limit 1
        )
      end
    ) as author_name,
    coalesce(a.primary_name, a2.primary_name, n.meta->>'primary_name', n.meta->>'applicant_name', '') as primary_name,
    coalesce(
      n.content,
      n.meta->>'content_preview',
      case when (n.meta ? 'note_id') then
        (
          select elem->>'text'
          from jsonb_array_elements(kc.reanalysis_notes) elem
          where (elem->>'id')::uuid = (n.meta->>'note_id')::uuid
          limit 1
        )
      end,
      ''
    ) as content,
    n.link_url,
    n.expires_at,
    n.read_at,
    n.created_at,
    n.card_id,
    n.applicant_id
  from public.inbox_notifications n
  left join public.kanban_cards kc on kc.id = n.card_id
  left join public.applicants a on a.id = n.applicant_id
  left join public.applicants a2 on a2.id = kc.applicant_id
  where n.user_id = auth.uid()
    and (n.expires_at is null or n.expires_at > now())
  order by n.created_at desc;
$function$;

drop function if exists public.list_my_tasks(text, text, timestamptz, timestamptz, text);
drop view if exists public.v_my_tasks;

create view public.v_my_tasks
with (security_invoker = true) as
select
  t.id,
  t.description,
  case
    when lower(coalesce(t.status, ''::text)) = any (array['completed'::text, 'concluida'::text, 'concluído'::text, 'concluido'::text, 'done'::text]) then 'completed'::text
    when lower(coalesce(t.status, ''::text)) = any (array['pending'::text, 'pendente'::text, 'open'::text]) then 'pending'::text
    else lower(coalesce(t.status, ''::text))
  end as status,
  t.deadline,
  t.created_at,
  t.updated_at,
  t.completed_at,
  t.card_id,
  kc.area,
  kc.stage,
  kc.applicant_id,
  a.primary_name as applicant_name,
  a.cpf_cnpj,
  t.assigned_to,
  ass.full_name as assigned_name,
  t.created_by,
  crt.full_name as created_name
from public.card_tasks t
join public.kanban_cards kc on kc.id = t.card_id
join public.applicants a on a.id = kc.applicant_id
left join public.profiles ass on ass.id = t.assigned_to
left join public.profiles crt on crt.id = t.created_by;

create function public.list_my_tasks(
  p_status text default null::text,
  p_due text default null::text,
  p_date_start timestamptz default null::timestamptz,
  p_date_end timestamptz default null::timestamptz,
  p_search text default null::text
)
returns setof public.v_my_tasks
language sql
security definer
set search_path to 'public', 'extensions'
as $function$
  with base as (
    select * from public.v_my_tasks m
    where m.assigned_to = auth.uid()
  )
  select * from base b
  where (
      p_status is null
      or lower(p_status) = 'all'
      or b.status = lower(p_status)
    )
    and (
      p_due is null or
      (p_due = 'hoje' and b.deadline::date = now()::date) or
      (p_due = 'amanha' and b.deadline::date = (now() + interval '1 day')::date) or
      (p_due = 'atrasado' and b.deadline is not null and b.deadline < now()) or
      (p_due = 'intervalo' and p_date_start is not null and p_date_end is not null and b.deadline between p_date_start and p_date_end)
    )
    and (
      p_search is null or
      unaccent(b.applicant_name) ilike unaccent('%'||p_search||'%') or
      unaccent(b.description) ilike unaccent('%'||p_search||'%')
    )
  order by
    (b.status = 'pending') desc,
    b.deadline nulls last,
    b.created_at desc;
$function$;

alter table if exists public.card_attachments
  drop constraint if exists card_attachments_comment_id_fkey,
  drop column if exists comment_id;

alter table if exists public.card_tasks
  drop constraint if exists card_tasks_comment_id_fkey,
  drop column if exists comment_id;

alter table if exists public.inbox_notifications
  drop constraint if exists inbox_notifications_comment_id_fkey,
  drop column if exists comment_id;

drop table if exists public.card_comments;
