-- Substitui list_my_mention_cards: agora busca menções diretamente no texto
-- dos pareceres (kanban_cards.reanalysis_notes[].text) em vez de inbox_notifications.
-- Procura por @full_name do usuário autenticado em qualquer nota não deletada.

do $$ begin
  create or replace function public.list_my_mention_cards()
  returns setof uuid
  language sql
  security definer
  set search_path = public
  as $f$
    select distinct kc.id
    from public.kanban_cards kc
    cross join lateral jsonb_array_elements(
      coalesce(kc.reanalysis_notes, '[]'::jsonb)
    ) as note
    where kc.deleted_at is null
      and kc.archived_at is null
      and coalesce((note->>'deleted')::boolean, false) = false
      and (note->>'text') ilike '%@' || (
        select coalesce(full_name, '')
        from public.profiles
        where id = auth.uid()
      ) || '%'
  $f$;
exception when others then null; end $$;

do $$ begin
  grant execute on function public.list_my_mention_cards() to authenticated;
exception when others then null; end $$;
