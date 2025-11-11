-- RLS policies for pf_fichas (run after kanban_cards exists)

drop policy if exists pf_select_access on public.pf_fichas;
drop policy if exists pf_select_roles on public.pf_fichas;
create policy pf_select_roles on public.pf_fichas for select
  using (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

drop policy if exists pf_update_access on public.pf_fichas;
drop policy if exists pf_update_roles on public.pf_fichas;
create policy pf_update_roles on public.pf_fichas for update
  using (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  )
  with check (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

drop policy if exists pf_insert_roles on public.pf_fichas;
create policy pf_insert_roles on public.pf_fichas for insert
  with check (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

