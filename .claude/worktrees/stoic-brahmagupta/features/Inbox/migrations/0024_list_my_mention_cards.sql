-- Returns the set of card_ids that have interactions (mentions/replies)
-- for the current authenticated user. Used by Kanban "Minhas menções" filter.

do $$ begin
  create or replace function public.list_my_mention_cards()
  returns setof uuid
  language sql
  security definer
  set search_path = public
  as $f$
    select distinct n.card_id
    from public.inbox_notifications n
    where n.user_id = auth.uid()
      and n.card_id is not null
      and (n.type::text) in ('mention','comment_reply','parecer_reply')
      and (n.expires_at is null or n.expires_at > now())
  $f$;
exception when others then null; end $$;

do $$ begin
  grant execute on function public.list_my_mention_cards() to authenticated;
exception when others then null; end $$;
