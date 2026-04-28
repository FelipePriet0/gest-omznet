-- Consolida as policies SELECT da role leitor nas policies existentes para
-- evitar multiplas policies permissivas por tabela/acao.

drop policy if exists leitor_select_profiles on public.profiles;
drop policy if exists leitor_select_applicants on public.applicants;
drop policy if exists leitor_select_pf_fichas on public.pf_fichas;
drop policy if exists leitor_select_pj_fichas on public.pj_fichas;
drop policy if exists leitor_select_kanban_cards on public.kanban_cards;
drop policy if exists leitor_select_card_comments on public.card_comments;
drop policy if exists leitor_select_card_attachments on public.card_attachments;
drop policy if exists leitor_select_card_tasks on public.card_tasks;
drop policy if exists leitor_select_inbox_notifications on public.inbox_notifications;
drop policy if exists leitor_select_deletion_log on public.deletion_log;
drop policy if exists leitor_select_builder_workflows on public.builder_workflows;
drop policy if exists leitor_select_builder_rules on public.builder_rules;
drop policy if exists leitor_select_routes on public.routes;
drop policy if exists leitor_select_priorities on public.priorities;
drop policy if exists leitor_select_technicians on public.technicians;
drop policy if exists leitor_select_agenda_free_rows on public.agenda_free_rows;
drop policy if exists leitor_select_schedule_reassignments on public.schedule_reassignments;
drop policy if exists "card-attachments select leitor" on storage.objects;

alter policy profiles_select_roles
on public.profiles
using (
  (
    current_user = any (array['authenticator'::name, 'supabase_auth_admin'::name, 'service_role'::name, 'supabase_admin'::name])
  )
  or (
    auth.role() = any (array['service_role'::text, 'supabase_admin'::text, 'supabase_auth_admin'::text])
  )
  or public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text])
);

alter policy applicants_select_roles
on public.applicants
using (public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy pf_select_roles
on public.pf_fichas
using (public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy pj_select_roles
on public.pj_fichas
using (public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy kanban_select_roles
on public.kanban_cards
using (public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy comments_select_roles
on public.card_comments
using (public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy attachments_select_roles
on public.card_attachments
using (public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy tasks_select_roles
on public.card_tasks
using (public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy inbox_select_own_or_gestor
on public.inbox_notifications
using (
  user_id = auth.uid()
  or public.user_has_role(array['leitor'::text])
);

alter policy deletion_log_select_gestor
on public.deletion_log
using (public.user_has_role(array['gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy bw_select
on public.builder_workflows
using (
  published_at is not null
  or owner_id = auth.uid()
  or public.user_has_role(array['instalador'::text, 'gestor'::text, 'leitor'::text])
);

alter policy builder_rules_select
on public.builder_rules
using (public.user_has_role(array['gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy reassign_select
on public.schedule_reassignments
using (public.user_has_role(array['gestor'::text, 'instalador'::text, 'leitor'::text]));

alter policy "card-attachments select access"
on storage.objects
using (
  bucket_id = 'card-attachments'
  and public.user_has_role(array['vendedor'::text, 'analista'::text, 'gestor'::text, 'instalador'::text, 'leitor'::text])
);
