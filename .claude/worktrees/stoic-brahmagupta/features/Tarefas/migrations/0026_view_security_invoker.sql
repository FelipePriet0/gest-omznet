-- Ensure v_my_tasks runs with invoker privileges
do $$ begin
  alter view public.v_my_tasks set (security_invoker = true);
exception when others then null; end $$;

-- Allow authenticated users to read the view
do $$ begin
  grant select on public.v_my_tasks to authenticated;
exception when others then null; end $$;

