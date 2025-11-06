-- Disable any deletion capability for cards and fichas without removing columns/schema

-- Revoke DELETE from anon/authenticated (keep service_role free to run maintenance if needed)
do $$ begin
  revoke delete on public.kanban_cards from anon, authenticated;
  revoke delete on public.applicants from anon, authenticated;
  revoke delete on public.pf_fichas from anon, authenticated;
  revoke delete on public.pj_fichas from anon, authenticated;
exception when others then null; end $$;

-- Deny DELETE at RLS level (defense-in-depth)
do $$ begin
  alter table public.kanban_cards enable row level security;
  drop policy if exists no_delete_kanban_cards on public.kanban_cards;
  create policy no_delete_kanban_cards on public.kanban_cards for delete using (false);
exception when others then null; end $$;

do $$ begin
  alter table public.applicants enable row level security;
  drop policy if exists no_delete_applicants on public.applicants;
  create policy no_delete_applicants on public.applicants for delete using (false);
exception when others then null; end $$;

do $$ begin
  alter table public.pf_fichas enable row level security;
  drop policy if exists no_delete_pf_fichas on public.pf_fichas;
  create policy no_delete_pf_fichas on public.pf_fichas for delete using (false);
exception when others then null; end $$;

do $$ begin
  alter table public.pj_fichas enable row level security;
  drop policy if exists no_delete_pj_fichas on public.pj_fichas;
  create policy no_delete_pj_fichas on public.pj_fichas for delete using (false);
exception when others then null; end $$;

-- Disable the RPC used by the frontend to soft-delete cards
do $$ begin
  create or replace function public.soft_delete_card(
    p_card_id uuid,
    p_reason text default null
  )
  returns public.kanban_cards
  language plpgsql
  security definer
  set search_path = public
  as $fn$
  declare
    v_row public.kanban_cards;
  begin
    raise exception 'operation_disabled' using message = 'Exclusão de cards está desabilitada.';
    return v_row;
  end;
  $fn$;
exception when others then null; end $$;


