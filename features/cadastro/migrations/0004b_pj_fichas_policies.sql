-- RLS policies for pj_fichas (run after kanban_cards exists)

drop policy if exists pj_select_access on public.pj_fichas;
create policy pj_select_access on public.pj_fichas for select
  using (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = pj_fichas.applicant_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );

drop policy if exists pj_update_access on public.pj_fichas;
create policy pj_update_access on public.pj_fichas for update
  using (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = pj_fichas.applicant_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  )
  with check (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = pj_fichas.applicant_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );

drop policy if exists pj_insert_roles on public.pj_fichas;
create policy pj_insert_roles on public.pj_fichas for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('vendedor','analista','gestor')));

