-- Triggers to generate inbox notifications from core events

-- 1) Task assigned and mentions in task description
do $$ begin
  create or replace function public.inbox_notify_task_events()
  returns trigger as $fn$
  declare
    v_title text;
    v_body  text;
    r_prof  record;
    v_area  text;
    v_url   text;
  begin
    -- On INSERT: notify assignee
    if (tg_op = 'INSERT') then
      if new.assigned_to is not null then
        select area into v_area from public.kanban_cards where id = new.card_id;
        v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;
        v_title := '📋 Nova tarefa atribuída';
        v_body  := coalesce('Você recebeu uma tarefa: '|| new.description, 'Você recebeu uma tarefa.');
        insert into public.inbox_notifications(user_id, type, priority, title, body, task_id, card_id, transient, expires_at, link_url)
        values (new.assigned_to, 'task', 'medium', v_title, v_body, new.id, new.card_id, false, null, v_url);
      end if;
      -- Mentions in description (simple match by full_name)
      for r_prof in select id, full_name from public.profiles loop
        if (new.description ilike '%'||'@'||coalesce(r_prof.full_name,'')||'%') then
          select area into v_area from public.kanban_cards where id = new.card_id;
          v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;
          insert into public.inbox_notifications(user_id, type, priority, title, body, task_id, card_id, transient, link_url)
          values (r_prof.id, 'task', 'low', '📋 Você foi mencionado em uma tarefa', coalesce(new.description,''), new.id, new.card_id, false, v_url);
        end if;
      end loop;
      return new;
    end if;

    -- On UPDATE: assignee change
    if (tg_op = 'UPDATE') then
      if (new.assigned_to is distinct from old.assigned_to) and new.assigned_to is not null then
        select area into v_area from public.kanban_cards where id = new.card_id;
        v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;
        v_title := '📋 Nova tarefa atribuída';
        v_body  := coalesce('Você recebeu uma tarefa: '|| new.description, 'Você recebeu uma tarefa.');
        insert into public.inbox_notifications(user_id, type, priority, title, body, task_id, card_id, transient, link_url)
        values (new.assigned_to, 'task', 'medium', v_title, v_body, new.id, new.card_id, false, v_url);
      end if;
      -- Mentions added on update
      if (new.description is distinct from old.description) then
        for r_prof in select id, full_name from public.profiles loop
          if (new.description ilike '%'||'@'||coalesce(r_prof.full_name,'')||'%') then
            -- avoid duplicate mention spam within short window
            if not exists (
              select 1 from public.inbox_notifications n
              where n.user_id = r_prof.id and n.task_id = new.id and n.type = 'task'
                and n.created_at > now() - interval '1 hour'
            ) then
              select area into v_area from public.kanban_cards where id = new.card_id;
              v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;
              insert into public.inbox_notifications(user_id, type, priority, title, body, task_id, card_id, transient, link_url)
              values (r_prof.id, 'task', 'low', '📋 Você foi mencionado em uma tarefa', coalesce(new.description,''), new.id, new.card_id, false, v_url);
            end if;
          end if;
        end loop;
      end if;
      return new;
    end if;
    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

do $$ begin
  drop trigger if exists trg_inbox_task_events on public.card_tasks;
  create trigger trg_inbox_task_events
  after insert or update of assigned_to, description on public.card_tasks
  for each row execute function public.inbox_notify_task_events();
exception when others then null; end $$;

-- 2) Mentions in comments
do $$ begin
  create or replace function public.inbox_notify_comment_mentions()
  returns trigger as $fn$
  declare r_prof record; v_author text; v_area text; v_url text;
  begin
    if new.content is null or new.deleted_at is not null then return new; end if;
    -- resolve author name if available
    v_author := coalesce(new.author_name, 'Alguém');
    for r_prof in select id, full_name from public.profiles loop
      if (new.content ilike '%'||'@'||coalesce(r_prof.full_name,'')||'%') then
        select area into v_area from public.kanban_cards where id = new.card_id;
        v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;
        insert into public.inbox_notifications(user_id, type, priority, title, body, comment_id, card_id, transient, link_url)
        values (
          r_prof.id,
          'comment',
          'low',
          '💬 Nova menção',
          v_author || ' mencionou você em uma conversa',
          new.id,
          new.card_id,
          false,
          v_url
        );
      end if;
    end loop;
    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

do $$ begin
  drop trigger if exists trg_inbox_comment_mentions on public.card_comments;
  create trigger trg_inbox_comment_mentions
  after insert on public.card_comments
  for each row execute function public.inbox_notify_comment_mentions();
exception when others then null; end $$;
