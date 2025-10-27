-- RLS policies for applicants (run after kanban_cards exists)

drop policy if exists applicants_select_access on public.applicants;
create policy applicants_select_access
  on public.applicants for select
  using (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = applicants.id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'
    )
  );

drop policy if exists applicants_update_access on public.applicants;
create policy applicants_update_access
  on public.applicants for update
  using (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = applicants.id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'
    )
  )
  with check (
    exists (
      select 1 from public.kanban_cards kc
      where kc.applicant_id = applicants.id
        and (kc.assignee_id = auth.uid() or kc.created_by = auth.uid())
    )
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gestor'
    )
  );

drop policy if exists applicants_insert_roles on public.applicants;
create policy applicants_insert_roles
  on public.applicants for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('vendedor','analista','gestor')));

