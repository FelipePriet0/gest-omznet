-- Scheduled-like scanners for due tasks and overdue cards

-- Helper: scan tasks due within N hours and notify assignees (transient, avoid dupes within window)
do $$ begin
  create or replace function public.inbox_scan_task_due(p_hours int default 4)
  returns int as $fn$
  declare r record; v_count int := 0; v_until timestamptz := now() + make_interval(hours=>p_hours);
  begin
    for r in
      select t.id, t.card_id, t.assigned_to, t.description, t.deadline, kc.area
      from public.card_tasks t
      join public.kanban_cards kc on kc.id = t.card_id
      where t.assigned_to is not null
        and t.status in ('pending','pendente')
        and t.deadline is not null
        and t.deadline > now()
        and t.deadline <= v_until
    loop
      -- skip if a recent transient due notification already exists in last p_hours
      if not exists (
        select 1 from public.inbox_notifications n
        where n.user_id = r.assigned_to
          and n.task_id = r.id
          and n.type = 'task'
          and n.transient is true
          and n.created_at > now() - make_interval(hours=>p_hours)
      ) then
        insert into public.inbox_notifications(user_id, type, priority, title, body, task_id, card_id, transient, expires_at, link_url)
        values (
          r.assigned_to,
          'task',
          'high',
          '⏰ Tarefa próxima do vencimento',
          coalesce('Eiii! A tarefa "'|| left(r.description, 80) ||'" está agendada para '|| to_char(r.deadline,'DD/MM/YYYY HH24:MI') ||'! Corre pra não atrasar!', 'Tarefa próxima do vencimento'),
          r.id,
          r.card_id,
          true,
          r.deadline,
          (case when r.area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end) || r.card_id::text
        );
        v_count := v_count + 1;
      end if;
    end loop;
    return v_count;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- Scan cards overdue and notify assignees/gestores every 4 hours (batch message)
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
      -- avoid duplicate batch for the same window
      if not exists (
        select 1 from public.inbox_notifications n
        where n.user_id = r.user_id and n.type = 'card'
          and n.created_at > now() - make_interval(hours=>p_hours_window)
          and (n.meta->>'kind') = 'overdue_batch'
      ) then
        insert into public.inbox_notifications(user_id, type, priority, title, body, transient, meta)
        values (
          r.user_id,
          'card',
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
