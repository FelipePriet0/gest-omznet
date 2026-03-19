-- Ass App overdue batch notifications (5h threshold), identical approach to fichas atrasadas

-- 1) Scanner: conta cards em Ass App atrasados por usuário e gera notificação agregada
do $$ begin
  create or replace function public.inbox_scan_ass_app_overdue(
    p_hours_window int default 4,
    p_threshold_hours int default 5
  )
  returns int as $fn$
  declare r record; v_count int := 0;
  begin
    for r in
      select p.id as user_id,
             count(*) as qtd
      from public.kanban_cards kc
      join public.profiles p on p.id = kc.assignee_id
      where kc.area = 'analise'
        and kc.stage = 'ass_app'
        and kc.deleted_at is null
        and p.role in ('analista','gestor')
        and kc.updated_at < now() - make_interval(hours=>p_threshold_hours)
      group by p.id
    loop
      -- Evita duplicar lote dentro da janela p_hours_window
      if not exists (
        select 1 from public.inbox_notifications n
        where n.user_id = r.user_id and n.type = 'ass_app'
          and n.created_at > now() - make_interval(hours=>p_hours_window)
          and (n.meta->>'kind') = 'overdue_batch'
      ) then
        insert into public.inbox_notifications(user_id, type, priority, title, body, transient, meta)
        values (
          r.user_id,
          'ass_app',
          'low',
          '🔔 Fichas com Ass app atrasadas',
          'Você possui '|| r.qtd ||' Ass Apps pendentes 🔔 — priorize-as.',
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

-- 2) Atualiza a função de manutenção para executar ambos os scanners
do $$ begin
  create or replace function public.run_inbox_maintenance()
  returns table(card_notifs int, ass_app_notifs int) as $fn$
  begin
    card_notifs := public.inbox_scan_cards_overdue(4);
    ass_app_notifs := public.inbox_scan_ass_app_overdue(4, 5);
    return next;
  end;
  $fn$ language plpgsql security definer set search_path = public;
exception when others then null; end $$;

