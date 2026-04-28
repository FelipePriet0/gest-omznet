-- Role LEITOR: acesso global de leitura, sem permissao de escrita.
--
-- Esta migration usa arrays text[] nas policies para evitar uso transacional
-- inseguro do novo valor do enum user_role antes do commit.

alter type public.user_role add value if not exists 'leitor';

-- O perfil pode ser atualizado pelo proprio usuario apenas para campos pessoais.
-- A coluna role nao deve ser alteravel pelo cliente autenticado.
revoke insert, update on table public.profiles from anon, authenticated;
grant insert (id, full_name) on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to public
using (
  auth.uid() = id
  and not public.user_has_role(array['leitor'::text])
)
with check (
  auth.uid() = id
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to public
with check (
  auth.uid() = id
  and not public.user_has_role(array['leitor'::text])
);

-- SELECT-only global para leitores nas tabelas do produto.
drop policy if exists leitor_select_profiles on public.profiles;
create policy leitor_select_profiles
on public.profiles
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_applicants on public.applicants;
create policy leitor_select_applicants
on public.applicants
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_pf_fichas on public.pf_fichas;
create policy leitor_select_pf_fichas
on public.pf_fichas
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_pj_fichas on public.pj_fichas;
create policy leitor_select_pj_fichas
on public.pj_fichas
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_kanban_cards on public.kanban_cards;
create policy leitor_select_kanban_cards
on public.kanban_cards
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_card_comments on public.card_comments;
create policy leitor_select_card_comments
on public.card_comments
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_card_attachments on public.card_attachments;
create policy leitor_select_card_attachments
on public.card_attachments
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_card_tasks on public.card_tasks;
create policy leitor_select_card_tasks
on public.card_tasks
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_inbox_notifications on public.inbox_notifications;
create policy leitor_select_inbox_notifications
on public.inbox_notifications
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_deletion_log on public.deletion_log;
create policy leitor_select_deletion_log
on public.deletion_log
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_builder_workflows on public.builder_workflows;
create policy leitor_select_builder_workflows
on public.builder_workflows
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_builder_rules on public.builder_rules;
create policy leitor_select_builder_rules
on public.builder_rules
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_routes on public.routes;
create policy leitor_select_routes
on public.routes
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_priorities on public.priorities;
create policy leitor_select_priorities
on public.priorities
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_technicians on public.technicians;
create policy leitor_select_technicians
on public.technicians
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_agenda_free_rows on public.agenda_free_rows;
create policy leitor_select_agenda_free_rows
on public.agenda_free_rows
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

drop policy if exists leitor_select_schedule_reassignments on public.schedule_reassignments;
create policy leitor_select_schedule_reassignments
on public.schedule_reassignments
for select
to authenticated
using (public.user_has_role(array['leitor'::text]));

-- Fechar policies de escrita baseadas em autoria/dono para usuarios convertidos
-- para leitor depois de ja terem criado dados.
drop policy if exists comments_update_own on public.card_comments;
create policy comments_update_own
on public.card_comments
for update
to public
using (
  author_id = auth.uid()
  and not public.user_has_role(array['leitor'::text])
)
with check (
  author_id = auth.uid()
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists comments_delete_author on public.card_comments;
create policy comments_delete_author
on public.card_comments
for delete
to public
using (
  author_id = auth.uid()
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists tasks_update_roles on public.card_tasks;
create policy tasks_update_roles
on public.card_tasks
for update
to public
using (
  created_by = auth.uid()
  and not public.user_has_role(array['leitor'::text])
)
with check (
  created_by = auth.uid()
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists tasks_delete_gestor on public.card_tasks;
create policy tasks_delete_gestor
on public.card_tasks
for delete
to public
using (
  created_by = auth.uid()
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists attachments_update_own on public.card_attachments;
create policy attachments_update_own
on public.card_attachments
for update
to public
using (
  (author_id = auth.uid() or public.user_has_role(array['gestor'::text, 'instalador'::text]))
  and not public.user_has_role(array['leitor'::text])
)
with check (
  (author_id = auth.uid() or public.user_has_role(array['gestor'::text, 'instalador'::text]))
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists attachments_delete_author_or_gestor on public.card_attachments;
create policy attachments_delete_author_or_gestor
on public.card_attachments
for delete
to public
using (
  (author_id = auth.uid() or public.user_has_role(array['gestor'::text, 'instalador'::text]))
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists inbox_update_read on public.inbox_notifications;
create policy inbox_update_read
on public.inbox_notifications
for update
to public
using (
  user_id = auth.uid()
  and not public.user_has_role(array['leitor'::text])
)
with check (
  user_id = auth.uid()
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists bw_update_owner on public.builder_workflows;
create policy bw_update_owner
on public.builder_workflows
for update
to authenticated
using (
  not public.user_has_role(array['leitor'::text])
  and (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = any (array['instalador'::public.user_role, 'gestor'::public.user_role])
    )
  )
)
with check (
  not public.user_has_role(array['leitor'::text])
  and (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = any (array['instalador'::public.user_role, 'gestor'::public.user_role])
    )
  )
);

-- Storage: leitores veem anexos, mas nao criam, atualizam ou removem objetos.
drop policy if exists "card-attachments select leitor" on storage.objects;
create policy "card-attachments select leitor"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'card-attachments'
  and public.user_has_role(array['leitor'::text])
);

drop policy if exists "card-attachments update own" on storage.objects;
create policy "card-attachments update own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'card-attachments'
  and owner = auth.uid()
  and not public.user_has_role(array['leitor'::text])
)
with check (
  bucket_id = 'card-attachments'
  and owner = auth.uid()
  and not public.user_has_role(array['leitor'::text])
);

drop policy if exists "card-attachments delete own" on storage.objects;
create policy "card-attachments delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'card-attachments'
  and owner = auth.uid()
  and not public.user_has_role(array['leitor'::text])
);
