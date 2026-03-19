-- Public RPC to run maintenance scans (to be scheduled externally)

do $$ begin
  create or replace function public.run_inbox_maintenance()
  returns table(task_notifs int, card_notifs int) as $fn$
  begin
    task_notifs := public.inbox_scan_task_due(4);
    card_notifs := public.inbox_scan_cards_overdue(4);
    return next;
  end;
  $fn$ language plpgsql security definer set search_path = public;
exception when others then null; end $$;
