-- Ensure v_historico_cards runs with invoker privileges
do $$ begin
  alter view public.v_historico_cards set (security_invoker = true);
exception when others then null; end $$;

-- Allow authenticated users to read the view
do $$ begin
  grant select on public.v_historico_cards to authenticated;
exception when others then null; end $$;

