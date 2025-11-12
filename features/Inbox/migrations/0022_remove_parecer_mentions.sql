-- Remove generation of 'mention' notifications inside add_parecer (parecer text mentions)
-- and clean up legacy 'mention' notifications that originated from parecer (meta.note_id, no comment_id).

begin;

-- 1) Update add_parecer to stop creating 'mention' notifications
do $$ begin
  create or replace function public.add_parecer(
    p_card_id uuid,
    p_text text,
    p_parent_id uuid default null,
    p_decision text default null
  )
  returns public.kanban_cards
  as $fn$
  declare
    v_row public.kanban_cards;
    v_notes jsonb;
    v_author record;
    v_note jsonb;
    v_parent jsonb;
    v_parent_author uuid;
    v_thread_id uuid;
    v_level int := 0;
    v_decision text := nullif(lower(trim(p_decision)), '');
    v_applicant uuid;
    v_note_id uuid;
    v_snap text;
  begin
    if not public.can_user_manage_card(p_card_id) then
      raise exception 'not_allowed' using message = 'Você não tem permissão.';
    end if;

    select * into v_row from public.kanban_cards where id = p_card_id for update;
    if not found then raise exception 'not_found' using message = 'Card não encontrado'; end if;
    v_applicant := v_row.applicant_id;

    if v_decision is not null and v_decision not in ('aprovado','negado','reanalise') then
      raise exception 'invalid_decision' using message = 'Decisão inválida.';
    end if;

    select id as author_id, coalesce(full_name,'') as author_name, role::text as author_role
      from public.profiles where id = auth.uid() into v_author;

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

    v_snap := left(coalesce(p_text,''), 600);

    -- Only reply notification to the parent author (no 'mention' generation here)
    if p_parent_id is not null and v_parent_author is not null and v_parent_author <> v_author.author_id then
      insert into public.inbox_notifications(
        user_id, type, priority,
        card_id, applicant_id, link_url, meta, content
      ) values (
        v_parent_author,
        'parecer_reply',
        'high',
        p_card_id,
        v_applicant,
        '/kanban/analise?card=' || p_card_id::text,
        jsonb_build_object('note_id', v_note_id),
        v_snap
      );
    end if;

    if v_decision in ('aprovado','negado') then
      perform public.set_card_decision(p_card_id, v_decision::public.kanban_decision_status);
    elsif v_decision = 'reanalise' then
      perform public.set_card_decision(p_card_id, 'reanalise'::public.kanban_decision_status);
    end if;

    return v_row;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- 2) Cleanup legacy 'mention' notifications created by parecer (optional as requested)
-- Criteria: type = 'mention' AND comment_id is null AND meta contains note_id
delete from public.inbox_notifications n
where n.type::text = 'mention'
  and n.comment_id is null
  and (n.meta ? 'note_id');

commit;

