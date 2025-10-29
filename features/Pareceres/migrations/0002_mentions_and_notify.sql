begin;

-- Dependências úteis
create extension if not exists unaccent;

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
  v_applicant uuid;
  v_note_id uuid;
  v_term text;
  v_body text;
begin
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Você não tem permissão.';
  end if;

  select * into v_row from public.kanban_cards where id = p_card_id for update;
  if not found then raise exception 'not_found' using message = 'Card não encontrado'; end if;
  v_applicant := v_row.applicant_id;

  -- Slash commands
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
    select elem from jsonb_array_elements(v_notes) elem where (elem->>'id')::uuid = p_parent_id limit 1 into v_parent;
    if v_parent is null then raise exception 'parent_not_found' using message = 'Parecer pai não encontrado'; end if;
    v_level := coalesce((v_parent->>'level')::int, 0) + 1;
    v_thread_id := coalesce((v_parent->>'thread_id')::uuid, (v_parent->>'id')::uuid);
  end if;

  v_note_id := gen_random_uuid();
  v_note := jsonb_build_object(
    'id', v_note_id,
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

  -- Mentions: extrai tokens iniciados por '@' e notifica perfis cujo full_name contenha o termo (case/accents insensitive)
  for v_term in
    select (regexp_matches(p_text, '@([A-Za-zÀ-ÿ0-9_\.\- ]+)', 'g'))[1]
  loop
    v_term := trim(both '@' from v_term);
    if v_term <> '' then
      insert into public.inbox_notifications(user_id, type, priority, title, body, meta, card_id, applicant_id)
      select p.id, 'comment', 'low', 'Você foi mencionado', 'Parecer: ' || left(p_text, 120),
             jsonb_build_object('note_id', v_note_id, 'author_name', v_author.author_name), p_card_id, v_applicant
      from public.profiles p
      where lower(unaccent(coalesce(p.full_name,''))) like '%' || lower(unaccent(v_term)) || '%'
        and p.id <> v_author.author_id
      on conflict do nothing;
    end if;
  end loop;

  return v_row;
end;$$;

grant execute on function public.add_parecer(uuid, text, uuid) to authenticated;

commit;
