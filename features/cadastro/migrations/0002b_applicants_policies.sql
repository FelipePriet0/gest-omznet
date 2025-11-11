-- RLS policies for applicants (run after kanban_cards exists)

drop policy if exists applicants_select_access on public.applicants;
drop policy if exists applicants_select_roles on public.applicants;
create policy applicants_select_roles
  on public.applicants for select
  using (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

drop policy if exists applicants_update_access on public.applicants;
drop policy if exists applicants_update_roles on public.applicants;
create policy applicants_update_roles
  on public.applicants for update
  using (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  )
  with check (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

drop policy if exists applicants_insert_roles on public.applicants;
create policy applicants_insert_roles
  on public.applicants for insert
  with check (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

