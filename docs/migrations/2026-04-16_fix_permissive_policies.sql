-- ============================================================
-- Migration: Corrigir policies permissivas demais
-- Date: 2026-04-16
-- ============================================================

-- agenda_free_rows UPDATE: restringir a instalador/gestor
DROP POLICY IF EXISTS authenticated_update_free_rows ON public.agenda_free_rows;
CREATE POLICY authenticated_update_free_rows ON public.agenda_free_rows
  FOR UPDATE
  USING (public.user_has_role(array['gestor','instalador']::user_role[]))
  WITH CHECK (public.user_has_role(array['gestor','instalador']::user_role[]));

-- deletion_log INSERT: restringir a quem pode deletar
DROP POLICY IF EXISTS deletion_log_insert_all ON public.deletion_log;
CREATE POLICY deletion_log_insert_roles ON public.deletion_log
  FOR INSERT
  WITH CHECK (public.user_has_role(array['analista','gestor','instalador']::user_role[]));

-- inbox_notifications INSERT: todos os roles (triggers disparam no contexto do usuário)
DROP POLICY IF EXISTS inbox_insert_all ON public.inbox_notifications;
CREATE POLICY inbox_insert_roles ON public.inbox_notifications
  FOR INSERT
  WITH CHECK (public.user_has_role(array['vendedor','analista','gestor','instalador']::user_role[]));
