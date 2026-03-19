begin;

-- 1) Permite armazenar reanálise como decisão explícita
do $$ begin
  alter type public.kanban_decision_status add value if not exists 'reanalise';
exception when duplicate_object then null; end $$;

-- 2) Recria set_card_decision para sincronizar stage com decision_status
drop function if exists public.set_card_decision(uuid, public.kanban_decision_status);
create or replace function public.set_card_decision(
  p_card_id uuid,
  p_decision public.kanban_decision_status
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kanban_cards;
  v_old_area text;
  v_old_stage text;
  v_target_stage text;
  v_now timestamptz := now();
begin
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Você não tem permissão.';
  end if;

  select *
    into v_row
    from public.kanban_cards
    where id = p_card_id
    for update;
  if not found then
    raise exception 'not_found' using message = 'Card não encontrado';
  end if;

  v_old_area := v_row.area::text;
  v_old_stage := v_row.stage;

  if p_decision is null then
    update public.kanban_cards
       set decision_status = null,
           decision_at = null,
           decision_by = null,
           updated_at = v_now
     where id = p_card_id
     returning * into v_row;
  else
    v_target_stage := case p_decision
      when 'aprovado' then 'aprovados'
      when 'negado' then 'negados'
      when 'reanalise' then 'reanalise'
      else v_row.stage
    end;

    update public.kanban_cards
       set decision_status = p_decision,
           decision_at = v_now,
           decision_by = auth.uid(),
           area = case when v_target_stage is not null then 'analise' else area end,
           stage = coalesce(v_target_stage, stage),
           updated_at = v_now
     where id = p_card_id
     returning * into v_row;
  end if;

  if (v_row.area::text is distinct from v_old_area) or (v_row.stage is distinct from v_old_stage) then
    perform public.notify_card_move(v_row, v_old_area, v_old_stage, v_row.area::text, v_row.stage);
  end if;

  return v_row;
end;$$;

grant execute on function public.set_card_decision(uuid, public.kanban_decision_status) to authenticated;

-- 3) Atualiza add_parecer para depender de decision_status
drop function if exists public.add_parecer(uuid, text, uuid);
drop function if exists public.add_parecer(uuid, text, uuid, text);
create or replace function public.add_parecer(
  p_card_id uuid,
  p_text text,
  p_parent_id uuid default null,
  p_decision text default null
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
  v_parent_author uuid;
  v_thread_id uuid;
  v_level int := 0;
  v_cmd text := lower(coalesce(trim(p_text),''));
  v_applicant uuid;
  v_note_id uuid;
  v_term text;
  v_body text;
  v_decision text;
begin
  if not public.user_has_role(array['analista','gestor']::user_role[]) then
    raise exception 'not_allowed' using message = 'Somente analistas ou gestores podem registrar parecer.';
  end if;

  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Você não tem permissão.';
  end if;

  select * into v_row from public.kanban_cards where id = p_card_id for update;
  if not found then raise exception 'not_found' using message = 'Card não encontrado'; end if;
  v_applicant := v_row.applicant_id;

  v_decision := nullif(lower(trim(p_decision)), '');
  if v_decision is not null and v_decision not in ('aprovado','negado','reanalise') then
    raise exception 'invalid_decision' using message = 'Decisão inválida.';
  end if;

  -- Slash commands
  if v_cmd like '/aprovado%' then
    perform public.set_card_decision(p_card_id, 'aprovado'::public.kanban_decision_status);
  elsif v_cmd like '/negado%' then
    perform public.set_card_decision(p_card_id, 'negado'::public.kanban_decision_status);
  elsif v_cmd like '/reanalise%' or v_cmd like '/reanálise%' then
    perform public.set_card_decision(p_card_id, 'reanalise'::public.kanban_decision_status);
  end if;

  -- autor
  select id as author_id, coalesce(full_name,'') as author_name, role::text as author_role
    from public.profiles
    where id = auth.uid()
    into v_author;

  v_notes := coalesce(v_row.reanalysis_notes, '[]'::jsonb);

  if p_parent_id is not null then
    select elem from jsonb_array_elements(v_notes) elem where (elem->>'id')::uuid = p_parent_id limit 1 into v_parent;
    if v_parent is null then raise exception 'parent_not_found' using message = 'Parecer pai não encontrado'; end if;
    v_level := coalesce((v_parent->>'level')::int, 0) + 1;
    v_thread_id := coalesce((v_parent->>'thread_id')::uuid, (v_parent->>'id')::uuid);
    v_parent_author := nullif((v_parent->>'author_id')::uuid, null);
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
    'is_thread_starter', case when p_parent_id is null then true else false end,
    'decision', v_decision
  );

  update public.kanban_cards
    set reanalysis_notes = coalesce(reanalysis_notes,'[]'::jsonb) || jsonb_build_array(v_note),
        updated_at = now()
    where id = p_card_id
    returning * into v_row;

  -- Reply notification to the parent author (if any and not self)
  if p_parent_id is not null and v_parent_author is not null and v_parent_author <> v_author.author_id then
    insert into public.inbox_notifications(
      user_id, type, priority,
      card_id, applicant_id, link_url, meta, content
    ) values (
      v_parent_author,
      'parecer_reply',
      'low',
      p_card_id,
      v_applicant,
      '/kanban/analise?card=' || p_card_id::text,
      jsonb_build_object('note_id', v_note_id, 'author_name', v_author.author_name),
      left(coalesce(p_text,''), 600)
    );
  end if;

  -- Mentions: extrai tokens iniciados por '@' e notifica perfis cujo full_name contenha o termo
  for v_term in
    select (regexp_matches(p_text, '@([A-Za-zÀ-ÿ0-9_\.\- ]+)', 'g'))[1]
  loop
    v_term := trim(both '@' from v_term);
    if v_term <> '' then
      insert into public.inbox_notifications(user_id, type, priority, meta, card_id, applicant_id, content)
      select p.id, 'comment', 'low',
             jsonb_build_object('note_id', v_note_id, 'author_name', v_author.author_name),
             p_card_id, v_applicant, left(coalesce(p_text, ''), 600)
      from public.profiles p
      where lower(unaccent(coalesce(p.full_name,''))) like '%' || lower(unaccent(v_term)) || '%'
        and p.id <> v_author.author_id
      on conflict do nothing;
    end if;
  end loop;

  if v_decision in ('aprovado','negado') then
    perform public.set_card_decision(p_card_id, v_decision::public.kanban_decision_status);
  elsif v_decision = 'reanalise' then
    perform public.set_card_decision(p_card_id, 'reanalise'::public.kanban_decision_status);
  end if;

  return v_row;
end;$$;

grant execute on function public.add_parecer(uuid, text, uuid, text) to authenticated;

-- 4) Atualiza edit_parecer para refletir o novo fluxo
drop function if exists public.edit_parecer(uuid, uuid, text);
drop function if exists public.edit_parecer(uuid, uuid, text, text);
create or replace function public.edit_parecer(
  p_card_id uuid,
  p_note_id uuid,
  p_text text,
  p_decision text default null
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kanban_cards;
  v_author record;
  v_decision text;
begin
  if not public.user_has_role(array['analista','gestor']::user_role[]) then
    raise exception 'not_allowed' using message = 'Somente analistas ou gestores podem editar parecer.';
  end if;

  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Sem permissão.';
  end if;

  v_decision := nullif(lower(trim(p_decision)), '');
  if v_decision is not null and v_decision not in ('aprovado','negado','reanalise') then
    raise exception 'invalid_decision' using message = 'Decisão inválida.';
  end if;

  select id as author_id, coalesce(full_name,'') as author_name
    from public.profiles
    where id = auth.uid()
    into v_author;

  update public.kanban_cards kc
  set reanalysis_notes = (
    select jsonb_agg(
      case when (elem->>'id')::uuid = p_note_id then
        elem
          || jsonb_build_object(
                'text', p_text,
                'updated_by_id', v_author.author_id,
                'updated_by_name', v_author.author_name,
                'updated_at', now()
             )
          || case
               when v_decision is null then '{}'::jsonb
               else jsonb_build_object('decision', v_decision)
             end
      else elem end
    )
    from jsonb_array_elements(coalesce(kc.reanalysis_notes,'[]'::jsonb)) elem
  ), updated_at = now()
  where kc.id = p_card_id
  returning * into v_row;

  if not found then raise exception 'not_found' using message = 'Card não encontrado'; end if;

  if v_decision in ('aprovado','negado') then
    perform public.set_card_decision(p_card_id, v_decision::public.kanban_decision_status);
  elsif v_decision = 'reanalise' then
    perform public.set_card_decision(p_card_id, 'reanalise'::public.kanban_decision_status);
  end if;

  return v_row;
end;$$;

grant execute on function public.edit_parecer(uuid, uuid, text, text) to authenticated;

-- 5) Atualiza delete_parecer para considerar autor
drop function if exists public.delete_parecer(uuid, uuid);
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
  if not public.user_has_role(array['analista','gestor']::user_role[]) then
    raise exception 'not_allowed' using message = 'Somente analistas ou gestores podem excluir parecer.';
  end if;

  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Sem permissão.';
  end if;

  if not exists (
    select 1
    from public.kanban_cards kc
    cross join jsonb_array_elements(coalesce(kc.reanalysis_notes,'[]'::jsonb)) elem
    where kc.id = p_card_id
      and (elem->>'id')::uuid = p_note_id
      and (elem->>'author_id')::uuid = auth.uid()
  ) then
    raise exception 'not_allowed' using message = 'Apenas o autor pode excluir o parecer.';
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
end;
$$;

grant execute on function public.delete_parecer(uuid, uuid) to authenticated;

commit;

