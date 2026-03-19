-- Normalize priority to only 'low' | 'high', remove 'transient',
-- and enforce expiry rules by type via a BEFORE INSERT trigger.

begin;

-- 1) Create new enum for priority with only low/high
do $$ begin
  create type notification_priority2 as enum ('low','high');
exception when duplicate_object then null; end $$;

-- 2) Migrate column to new enum, mapping any legacy/NULL to sensible defaults
alter table public.inbox_notifications
  alter column priority type notification_priority2
  using (
    case lower(coalesce(priority::text,'low'))
      when 'high' then 'high'::notification_priority2
      else 'low'::notification_priority2
    end
  );

-- 3) Drop column 'transient'
do $$ begin
  alter table public.inbox_notifications drop column if exists transient;
exception when undefined_column then null; end $$;

-- 4) BEFORE INSERT trigger to enforce priority/expiry by type
create or replace function public.inbox_notifications_enforce_priority_expiry()
returns trigger as $fn$
begin
  -- Normalize priority by type when not provided or invalid
  if NEW.type in ('mention','parecer_reply','comment_reply') then
    NEW.priority := 'high'::notification_priority2;
    if NEW.expires_at is not null then NEW.expires_at := null; end if;
  elsif NEW.type in ('ass_app','fichas_atrasadas') then
    NEW.priority := 'low'::notification_priority2;
    if NEW.expires_at is null then NEW.expires_at := now() + interval '14 days'; end if;
  end if;
  return NEW;
end;
$fn$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_inbox_notifications_enforce on public.inbox_notifications;
create trigger trg_inbox_notifications_enforce
before insert on public.inbox_notifications
for each row execute function public.inbox_notifications_enforce_priority_expiry();

-- 5) Update comment mention trigger: set priority=high and remove transient column usage
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
  begin
    if new.content is null or new.deleted_at is not null then
      return new;
    end if;

    v_author := coalesce(new.author_name, 'Alguém');

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
          comment_id, card_id, applicant_id, link_url, meta
        ) values (
          r_prof.id,
          'mention',
          'high',
          '💬 Nova menção',
          left(coalesce(new.content, ''), 600),
          new.id,
          new.card_id,
          v_applicant_id,
          v_url,
          jsonb_build_object(
            'author_name', v_author,
            'content_preview', left(coalesce(new.content, ''), 600),
            'primary_name', v_applicant_name,
            'applicant_name', v_applicant_name,
            'card_title', v_applicant_name
          )
        );
      end if;
    end loop;

    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- 6) Update comment reply trigger: set priority=high and remove transient
do $$ begin
  create or replace function public.inbox_notify_comment_replies()
  returns trigger as $fn$
  declare
    v_parent record;
    v_area text;
    v_url text;
    v_author text;
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

      insert into public.inbox_notifications(
        user_id, type, priority, title, body,
        comment_id, card_id, applicant_id, link_url, meta
      ) values (
        v_parent.author_id,
        'comment_reply',
        'high',
        '↩️ Nova resposta na conversa',
        left(coalesce(new.content,''), 600),
        new.id,
        new.card_id,
        new.applicant_id,
        v_url,
        jsonb_build_object('author_name', v_author)
      );
    end if;

    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- 7) Update add_parecer to use correct types and priority
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

    -- autor
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

    -- Reply notification to the parent author
    if p_parent_id is not null and v_parent_author is not null and v_parent_author <> v_author.author_id then
      insert into public.inbox_notifications(
        user_id, type, priority, title, body,
        card_id, applicant_id, link_url, meta
      ) values (
        v_parent_author,
        'parecer_reply',
        'high',
        '↩️ Nova resposta no parecer',
        left(coalesce(p_text,''), 600),
        p_card_id,
        v_applicant,
        '/kanban/analise?card=' || p_card_id::text,
        jsonb_build_object('note_id', v_note_id, 'author_name', v_author.author_name)
      );
    end if;

    -- Mentions in parecer text: create 'mention' notifications (priority high)
    for v_term in
      select (regexp_matches(p_text, '@([A-Za-zÀ-ÿ0-9_\.\- ]+)', 'g'))[1]
    loop
      v_term := trim(both '@' from v_term);
      if v_term <> '' then
        insert into public.inbox_notifications(user_id, type, priority, title, body, meta, card_id, applicant_id)
        select p.id, 'mention', 'high', '💬 Nova menção', 'Parecer: ' || left(p_text, 120),
               jsonb_build_object('note_id', v_note_id, 'author_name', v_author.author_name), p_card_id, v_applicant
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

-- 8) Overdue scanner: ensure priority low and remove transient; expiry handled by BEFORE INSERT
do $$ begin
  create or replace function public.inbox_scan_cards_overdue(p_hours_window int default 4)
  returns int as $fn$
  declare r record; v_count int := 0;
  begin
    for r in
      select p.id as user_id,
             count(*) as qtd
      from public.kanban_cards kc
      join public.profiles p on p.id = kc.assignee_id
      where kc.due_at is not null and kc.due_at < now()
        and p.role in ('analista','gestor')
        and kc.deleted_at is null
      group by p.id
    loop
      if not exists (
        select 1 from public.inbox_notifications n
        where n.user_id = r.user_id and n.type = 'fichas_atrasadas'
          and n.created_at > now() - make_interval(hours=>p_hours_window)
          and (n.meta->>'kind') = 'overdue_batch'
      ) then
        insert into public.inbox_notifications(user_id, type, priority, title, body, meta)
        values (
          r.user_id,
          'fichas_atrasadas',
          'low',
          '🔥 Fichas atrasadas',
          'Você possui '|| r.qtd ||' fichas pendentes 🔥 — priorize-as.',
          jsonb_build_object('kind','overdue_batch')
        );
        v_count := v_count + 1;
      end if;
    end loop;
    return v_count;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- 9) List RPC: avoid enum dependency by returning priority as text
do $$ begin
  create or replace function public.list_inbox_notifications()
  returns table (
    id uuid,
    user_id uuid,
    type text,
    priority text,
    title text,
    body text,
    content text,
    meta jsonb,
    card_id uuid,
    comment_id uuid,
    link_url text,
    expires_at timestamptz,
    read_at timestamptz,
    created_at timestamptz,
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
      n.title,
      n.body,
      coalesce(
        n.content,
        (
          case
            when (n.meta ? 'note_id') and kc.reanalysis_notes is not null then
              (
                select elem->>'text'
                from jsonb_array_elements(kc.reanalysis_notes) elem
                where (elem->>'id')::uuid = (n.meta->>'note_id')::uuid
                limit 1
              )
          end
        ),
        (
          select cc.content from public.card_comments cc where cc.id = n.comment_id
        ),
        n.body
      ) as content,
      n.meta,
      n.card_id,
      n.comment_id,
      n.link_url,
      n.expires_at,
      n.read_at,
      n.created_at,
      n.applicant_id
    from public.inbox_notifications n
    left join public.kanban_cards kc on kc.id = n.card_id
    where n.user_id = auth.uid()
      and n.type in ('mention','parecer_reply','comment_reply','ass_app','fichas_atrasadas')
      and (n.expires_at is null or n.expires_at > now())
    order by n.created_at desc;
  $f$;
exception when others then null; end $$;

-- 10) Finalize: drop old enum and rename new to original name
do $$ begin
  begin
    drop type if exists notification_priority;
  exception when undefined_object then null; end;
  alter type notification_priority2 rename to notification_priority;
exception when others then null; end $$;

commit;
