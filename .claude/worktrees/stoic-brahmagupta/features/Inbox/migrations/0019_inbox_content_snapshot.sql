-- Inbox content snapshot: add `content` column and populate it on creation.
-- Also backfill existing notifications and update triggers/RPCs to prefer `n.content`.

begin;

-- 1) Add `content` column (idempotente)
alter table public.inbox_notifications
  add column if not exists content text;

-- 2) Backfill: tenta comentário -> parecer(note_id) -> fallback body
update public.inbox_notifications n
set content = coalesce(
  (select cc.content from public.card_comments cc where cc.id = n.comment_id),
  (
    select elem->>'text'
    from public.kanban_cards kc,
         lateral jsonb_array_elements(kc.reanalysis_notes) elem
    where kc.id = n.card_id
      and (n.meta ? 'note_id')
      and (elem->>'id')::uuid = (n.meta->>'note_id')::uuid
    limit 1
  ),
  n.body
)
where (n.content is null or n.content = '');

-- 3) Atualiza triggers para gravar snapshot em `content`
do $$ begin
  create or replace function public.inbox_notify_comment_mentions()
  returns trigger as $fn$
  declare
    r_prof record;
    v_author text;
    v_area text;
    v_url text;
    v_applicant_id uuid;
    v_applicant_name text;
    v_snap text;
  begin
    if new.content is null or new.deleted_at is not null then
      return new;
    end if;

    v_author := coalesce(new.author_name, 'Alguém');
    v_snap := left(coalesce(new.content, ''), 600);

    select kc.area, kc.applicant_id, a.primary_name
      into v_area, v_applicant_id, v_applicant_name
    from public.kanban_cards kc
    left join public.applicants a on a.id = kc.applicant_id
    where kc.id = new.card_id;

    v_area := coalesce(v_area, 'analise');

    for r_prof in select id, full_name from public.profiles loop
      if (
        new.content ilike '%' || '@' || coalesce(r_prof.full_name, '') || '%'
        and new.author_id is distinct from r_prof.id
      ) then
        v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;

        insert into public.inbox_notifications(
          user_id, type, priority, title, body,
          comment_id, card_id, applicant_id, link_url, meta, content
        ) values (
          r_prof.id,
          'mention',
          'high',
          '💬 Nova menção',
          v_snap,
          new.id,
          new.card_id,
          v_applicant_id,
          v_url,
          jsonb_build_object(
            'author_name', v_author,
            'content_preview', v_snap,
            'primary_name', v_applicant_name,
            'applicant_name', v_applicant_name,
            'card_title', v_applicant_name
          ),
          v_snap
        );
      end if;
    end loop;

    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

do $$ begin
  create or replace function public.inbox_notify_comment_replies()
  returns trigger as $fn$
  declare
    v_parent record;
    v_area text;
    v_url text;
    v_author text;
    v_snap text;
  begin
    if new.parent_id is null or new.deleted_at is not null then
      return new;
    end if;

    select c.author_id, kc.area, coalesce(new.author_name,'Alguém') as author_name
      into v_parent
    from public.card_comments c
    join public.kanban_cards kc on kc.id = new.card_id
    where c.id = new.parent_id;

    if v_parent.author_id is not null and v_parent.author_id <> new.author_id then
      v_area := coalesce(v_parent.area, 'analise');
      v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;
      v_author := coalesce(new.author_name, 'Alguém');
      v_snap := left(coalesce(new.content,''), 600);

      insert into public.inbox_notifications(
        user_id, type, priority, title, body,
        comment_id, card_id, applicant_id, link_url, meta, content
      ) values (
        v_parent.author_id,
        'comment_reply',
        'high',
        '↩️ Nova resposta na conversa',
        v_snap,
        new.id,
        new.card_id,
        new.applicant_id,
        v_url,
        jsonb_build_object('author_name', v_author),
        v_snap
      );
    end if;

    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- 4) Atualiza add_parecer para preencher `content`
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
    v_term text;
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

    if p_parent_id is not null and v_parent_author is not null and v_parent_author <> v_author.author_id then
      insert into public.inbox_notifications(
        user_id, type, priority, title, body,
        card_id, applicant_id, link_url, meta, content
      ) values (
        v_parent_author,
        'parecer_reply',
        'high',
        '↩️ Nova resposta no parecer',
        v_snap,
        p_card_id,
        v_applicant,
        '/kanban/analise?card=' || p_card_id::text,
        jsonb_build_object('note_id', v_note_id, 'author_name', v_author.author_name),
        v_snap
      );
    end if;

    for v_term in
      select (regexp_matches(p_text, '@([A-Za-zÀ-ÿ0-9_\.\- ]+)', 'g'))[1]
    loop
      v_term := trim(both '@' from v_term);
      if v_term <> '' then
        insert into public.inbox_notifications(user_id, type, priority, title, body, meta, card_id, applicant_id, content)
        select p.id, 'mention', 'high', '💬 Nova menção', 'Parecer: ' || v_snap,
               jsonb_build_object('note_id', v_note_id, 'author_name', v_author.author_name), p_card_id, v_applicant,
               v_snap
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
  end;
  $fn$ language plpgsql security definer set search_path = public;
exception when others then null; end $$;

commit;

