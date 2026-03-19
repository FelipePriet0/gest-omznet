-- RPCs para manipular pareceres (kanban_cards.reanalysis_notes JSONB[])
-- Inclui: adicionar, editar, soft-delete, responder (thread)
-- Integra com change_stage via comandos /Aprovado, /Negado, /Reanalise

begin;

create or replace function public.add_parecer(
  p_card_id uuid,
  p_text text,
  p_parent_id uuid default null
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kanban_cards;
  v_notes jsonb;
  v_author record;
  v_note jsonb;
  v_parent jsonb;
  v_thread_id uuid;
  v_level int := 0;
  v_cmd text := lower(coalesce(trim(p_text),''));
begin
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Você não tem permissão.';
  end if;

  select * into v_row from public.kanban_cards where id = p_card_id for update;
  if not found then raise exception 'not_found' using message = 'Card não encontrado'; end if;

  -- Slash commands: direciona stage antes (Analise)
  if v_cmd like '/aprovado%' then
    perform public.change_stage(p_card_id, 'analise', 'aprovados', null);
  elsif v_cmd like '/negado%' then
    perform public.change_stage(p_card_id, 'analise', 'negados', null);
  elsif v_cmd like '/reanalise%' or v_cmd like '/reanálise%' then
    perform public.change_stage(p_card_id, 'analise', 'reanalise', null);
  end if;

  -- autor
  select id as author_id, coalesce(full_name,'') as author_name, role::text as author_role from public.profiles where id = auth.uid() into v_author;

  v_notes := coalesce(v_row.reanalysis_notes, '[]'::jsonb);

  if p_parent_id is not null then
    -- localizar parent
    select elem from jsonb_array_elements(v_notes) elem where (elem->>'id')::uuid = p_parent_id limit 1 into v_parent;
    if v_parent is null then raise exception 'parent_not_found' using message = 'Parecer pai não encontrado'; end if;
    v_level := coalesce((v_parent->>'level')::int, 0) + 1;
    v_thread_id := coalesce((v_parent->>'thread_id')::uuid, (v_parent->>'id')::uuid);
  end if;

  v_note := jsonb_build_object(
    'id', gen_random_uuid(),
    'text', p_text,
    'author_id', v_author.author_id,
    'author_name', v_author.author_name,
    'author_role', v_author.author_role,
    'created_at', now(),
    'parent_id', p_parent_id,
    'level', v_level,
    'thread_id', v_thread_id,
    'is_thread_starter', case when p_parent_id is null then true else false end
  );

  update public.kanban_cards
    set reanalysis_notes = coalesce(reanalysis_notes,'[]'::jsonb) || jsonb_build_array(v_note), updated_at = now()
    where id = p_card_id
    returning * into v_row;

  return v_row;
end;$$;

create or replace function public.edit_parecer(
  p_card_id uuid,
  p_note_id uuid,
  p_text text
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kanban_cards;
  v_author record;
begin
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Sem permissão.';
  end if;
  select id as author_id, coalesce(full_name,'') as author_name from public.profiles where id = auth.uid() into v_author;

  update public.kanban_cards kc
  set reanalysis_notes = (
    select jsonb_agg(
      case when (elem->>'id')::uuid = p_note_id then
        elem || jsonb_build_object('text', p_text, 'updated_by_id', v_author.author_id, 'updated_by_name', v_author.author_name, 'updated_at', now())
      else elem end
    )
    from jsonb_array_elements(coalesce(kc.reanalysis_notes,'[]'::jsonb)) elem
  ), updated_at = now()
  where kc.id = p_card_id
  returning * into v_row;

  if not found then raise exception 'not_found' using message = 'Card não encontrado'; end if;
  return v_row;
end;$$;

create or replace function public.delete_parecer(
  p_card_id uuid,
  p_note_id uuid
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kanban_cards;
begin
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Sem permissão.';
  end if;
  update public.kanban_cards kc
  set reanalysis_notes = (
    select jsonb_agg(
      case when (elem->>'id')::uuid = p_note_id then
        elem || jsonb_build_object('deleted', true, 'updated_at', now())
      else elem end
    )
    from jsonb_array_elements(coalesce(kc.reanalysis_notes,'[]'::jsonb)) elem
  ), updated_at = now()
  where kc.id = p_card_id
  returning * into v_row;
  return v_row;
end;$$;

grant execute on function public.add_parecer(uuid, text, uuid) to authenticated;
grant execute on function public.edit_parecer(uuid, uuid, text) to authenticated;
grant execute on function public.delete_parecer(uuid, uuid) to authenticated;

commit;

