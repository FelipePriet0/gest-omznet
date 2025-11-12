-- Update list_inbox_notifications RPC to deliver all fields the UI needs
-- without depending on meta on the client. No schema changes; compute
-- author_name, primary_name and content via joins/JSON lookup when needed.

begin;

do $$ begin
  create or replace function public.list_inbox_notifications()
  returns table (
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
    comment_id uuid,
    applicant_id uuid
  )
  language sql
  security definer
  set search_path = public
  as $f$
    select
      n.id,
      n.user_id,
      n.type::text,
      n.priority::text,
      coalesce(
        (select cc.author_name from public.card_comments cc where cc.id = n.comment_id),
        (
          case when (n.meta ? 'note_id') then
            (
              select elem->>'author_name'
              from jsonb_array_elements(kc.reanalysis_notes) elem
              where (elem->>'id')::uuid = (n.meta->>'note_id')::uuid
              limit 1
            )
          end
        ),
        'Alguém'
      ) as author_name,
      coalesce(a.primary_name, a2.primary_name, '') as primary_name,
      coalesce(
        n.content,
        (select cc.content from public.card_comments cc where cc.id = n.comment_id),
        (
          case when (n.meta ? 'note_id') then
            (
              select elem->>'text'
              from jsonb_array_elements(kc.reanalysis_notes) elem
              where (elem->>'id')::uuid = (n.meta->>'note_id')::uuid
              limit 1
            )
          end
        ),
        ''
      ) as content,
      n.link_url,
      n.expires_at,
      n.read_at,
      n.created_at,
      n.card_id,
      n.comment_id,
      n.applicant_id
    from public.inbox_notifications n
    left join public.kanban_cards kc on kc.id = n.card_id
    left join public.applicants a on a.id = n.applicant_id
    left join public.applicants a2 on a2.id = kc.applicant_id
    where n.user_id = auth.uid()
      and (n.expires_at is null or n.expires_at > now())
    order by n.created_at desc;
  $f$;
exception when others then null; end $$;

commit;

