-- Redefinição dos tipos de notificação e ajustes de funcoes/triggers

-- 1) Criar novo enum com os tipos finais
do $$ begin
  create type notification_type_v2 as enum (
    'mention',
    'parecer_reply',
    'comment_reply',
    'ass_app',
    'fichas_atrasadas'
  );
exception when duplicate_object then null; end $$;

-- 2) Migrar a coluna public.inbox_notifications.type para o novo enum, mapeando valores legados
do $$ begin
  alter table public.inbox_notifications
    alter column type type notification_type_v2 using (
      case
        when type::text = 'task' then 'fichas_atrasadas'::notification_type_v2
        when type::text = 'card' then 'fichas_atrasadas'::notification_type_v2
        when type::text = 'system' then 'fichas_atrasadas'::notification_type_v2
        when type::text = 'comment' then (
          case
            when coalesce(title,'') ilike '%menç%'
              or (meta ? 'content_preview')
              or coalesce(title,'') ilike '💬%'
            then 'mention'::notification_type_v2
            else 'comment_reply'::notification_type_v2
          end
        )
        else 'fichas_atrasadas'::notification_type_v2
      end
    );
exception when others then null; end $$;

-- 3) Remover enum antigo e renomear notification_type_v2 -> notification_type
do $$ begin
  -- tenta dropar o tipo antigo se existir
  begin
    drop type if exists notification_type cascade;
  exception when undefined_object then null;
  end;
  alter type notification_type_v2 rename to notification_type;
exception when others then null; end $$;

-- 4) Atualizar função de scanner de fichas atrasadas para usar o novo tipo
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
        insert into public.inbox_notifications(user_id, type, priority, title, body, transient, meta)
        values (
          r.user_id,
          'fichas_atrasadas',
          'medium',
          '🔥 Fichas atrasadas',
          'Você possui '|| r.qtd ||' fichas pendentes 🔥 — priorize-as.',
          true,
          jsonb_build_object('kind','overdue_batch')
        );
        v_count := v_count + 1;
      end if;
    end loop;
    return v_count;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- 5) Atualizar trigger de menções em comentários para usar o tipo 'mention'
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
          user_id,
          type,
          priority,
          title,
          body,
          comment_id,
          card_id,
          applicant_id,
          transient,
          link_url,
          meta
        )
        values (
          r_prof.id,
          'mention',
          'low',
          '💬 Nova menção',
          left(coalesce(new.content, ''), 600),
          new.id,
          new.card_id,
          v_applicant_id,
          false,
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

-- 6) Atualizar RPC para explicitar apenas os tipos válidos
do $$ begin
  create or replace function public.list_inbox_notifications()
  returns table (
    id uuid,
    user_id uuid,
    type text,
    priority notification_priority,
    title text,
    body text,
    content text,
    meta jsonb,
    card_id uuid,
    comment_id uuid,
    link_url text,
    transient boolean,
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
      n.priority,
      n.title,
      n.body,
      coalesce(
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
      n.transient,
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
  grant execute on function public.list_inbox_notifications() to authenticated;
exception when others then null; end $$;

-- 7) Índices úteis
do $$ begin
  create index if not exists inbox_notifications_user_type_read_idx on public.inbox_notifications(user_id, type, read_at);
exception when others then null; end $$;

