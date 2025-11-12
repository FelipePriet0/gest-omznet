-- Drop obsolete task_id from inbox_notifications and remove task scanner if present

begin;

-- 1) Drop column task_id (idempotente)
alter table public.inbox_notifications
  drop column if exists task_id;

-- 2) Drop legacy task due scanner (references task_id)
do $$ begin
  drop function if exists public.inbox_scan_task_due(integer);
exception when undefined_function then null; end $$;

commit;

