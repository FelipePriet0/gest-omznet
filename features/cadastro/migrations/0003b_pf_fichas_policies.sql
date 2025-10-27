-- RLS policies for pf_fichas (run after kanban_cards exists)

drop policy if exists pf_select_access on public.pf_fichas;
create policy pf_select_access on public.pf_fichas for select
  using (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = pf_fichas.applicant_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );

drop policy if exists pf_update_access on public.pf_fichas;
create policy pf_update_access on public.pf_fichas for update
  using (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = pf_fichas.applicant_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  )
  with check (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = pf_fichas.applicant_id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor')
  );

drop policy if exists pf_insert_roles on public.pf_fichas;
create policy pf_insert_roles on public.pf_fichas for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('vendedor','analista','gestor')));

