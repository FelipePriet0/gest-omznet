-- RLS policies for pj_fichas (run after kanban_cards exists)

drop policy if exists pj_select_access on public.pj_fichas;
drop policy if exists pj_select_roles on public.pj_fichas;
create policy pj_select_roles on public.pj_fichas for select
  using (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

drop policy if exists pj_update_access on public.pj_fichas;
drop policy if exists pj_update_roles on public.pj_fichas;
create policy pj_update_roles on public.pj_fichas for update
  using (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  )
  with check (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

drop policy if exists pj_insert_roles on public.pj_fichas;
create policy pj_insert_roles on public.pj_fichas for insert
  with check (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

