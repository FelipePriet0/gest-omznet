-- ============================================================
-- Migration: search_path em todas as funções INVOKER + extensions
-- Date: 2026-04-16
-- ============================================================

-- Funções INVOKER
ALTER FUNCTION public.add_parecer(uuid, text, uuid, text) SET search_path = public;
ALTER FUNCTION public.compile_builder_workflow(uuid) SET search_path = public;
ALTER FUNCTION public.create_technician(text, text, date, date) SET search_path = public;
ALTER FUNCTION public.deactivate_technician(uuid) SET search_path = public;
ALTER FUNCTION public.delete_builder_workflow(uuid) SET search_path = public;
ALTER FUNCTION public.delete_technician(uuid) SET search_path = public;
ALTER FUNCTION public.duplicate_builder_workflow(uuid) SET search_path = public;
ALTER FUNCTION public.eligible_technicians(uuid) SET search_path = public;
ALTER FUNCTION public.f_unaccent(text) SET search_path = public;
ALTER FUNCTION public.get_builder_workflow(uuid) SET search_path = public;
ALTER FUNCTION public.inbox_notify_comment_mentions() SET search_path = public;
ALTER FUNCTION public.inbox_notify_comment_replies() SET search_path = public;
ALTER FUNCTION public.inbox_notify_mentions() SET search_path = public;
ALTER FUNCTION public.inbox_scan_cards_overdue(integer) SET search_path = public;
ALTER FUNCTION public.is_installer() SET search_path = public;
ALTER FUNCTION public.list_builder_workflows() SET search_path = public;
ALTER FUNCTION public.list_technicians(boolean) SET search_path = public;
ALTER FUNCTION public.log_deletion_generic() SET search_path = public;
ALTER FUNCTION public.move_schedule(uuid, date, text, uuid) SET search_path = public;
ALTER FUNCTION public.norm_priority(text) SET search_path = public;
ALTER FUNCTION public.norm_text(text) SET search_path = public;
ALTER FUNCTION public.normalize_user_role(text) SET search_path = public;
ALTER FUNCTION public.propagate_profile_role_to_comments() SET search_path = public;
ALTER FUNCTION public.publish_builder_workflow(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.reassign_by_workflow(date, date, integer) SET search_path = public;
ALTER FUNCTION public.reassign_by_workflow(date, date) SET search_path = public;
ALTER FUNCTION public.reassign_for_applicant(uuid, date, date, integer) SET search_path = public;
ALTER FUNCTION public.reassign_for_card(uuid) SET search_path = public;
ALTER FUNCTION public.reassign_for_technician(uuid, date, date, boolean, integer) SET search_path = public;
ALTER FUNCTION public.save_builder_workflow(uuid, text, jsonb) SET search_path = public;
ALTER FUNCTION public.set_comment_author_role() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.set_updated_at_generic() SET search_path = public;
ALTER FUNCTION public.toggle_technician_active(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.toggle_workflow_active(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.trg_card_tasks_defaults() SET search_path = public;
ALTER FUNCTION public.trg_kanban_normalize() SET search_path = public;
ALTER FUNCTION public.trg_kanban_stage_normalize() SET search_path = public;
ALTER FUNCTION public.trg_prevent_slot_conflict() SET search_path = public;
ALTER FUNCTION public.trg_reassign_on_applicant_update() SET search_path = public;
ALTER FUNCTION public.trg_reassign_on_card_update() SET search_path = public;
ALTER FUNCTION public.trg_reassign_on_technician_change() SET search_path = public;
ALTER FUNCTION public.update_schedule_meta(uuid, text) SET search_path = public;
ALTER FUNCTION public.update_technician(uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.update_technician_info(uuid, text, text, date, date) SET search_path = public;
ALTER FUNCTION public.validate_builder_state(jsonb) SET search_path = public;
ALTER FUNCTION public.validate_move(uuid, uuid, date, text) SET search_path = public;

-- Extensions → schema extensions
ALTER EXTENSION unaccent SET SCHEMA extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- f_unaccent: referência atualizada para extensions.unaccent
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, extensions
AS $$ SELECT extensions.unaccent('extensions.unaccent', $1) $$;

-- Funções que chamam unaccent sem prefixo: search_path inclui extensions
ALTER FUNCTION public.list_historico(text, timestamptz, timestamptz, text, uuid)
  SET search_path = public, extensions;
ALTER FUNCTION public.list_my_tasks(text, text, timestamptz, timestamptz, text)
  SET search_path = public, extensions;

-- agenda_free_rows INSERT: restringir a gestor/instalador
DROP POLICY IF EXISTS authenticated_insert_free_rows ON public.agenda_free_rows;
CREATE POLICY authenticated_insert_free_rows ON public.agenda_free_rows
  FOR INSERT
  WITH CHECK (public.user_has_role(array['gestor','instalador']::user_role[]));
