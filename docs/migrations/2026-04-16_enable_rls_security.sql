-- ============================================================
-- Migration: Habilitar RLS nas tabelas expostas
-- Date: 2026-04-16
-- Critical fix: kanban_cards, schedule_reassignments, builder_rules
-- ============================================================

-- 1) kanban_cards: políticas já existem, só faltava o RLS ligado
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

-- 2) schedule_reassignments: log de reatribuições automáticas do Builder
ALTER TABLE public.schedule_reassignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reassign_select ON public.schedule_reassignments;
CREATE POLICY reassign_select ON public.schedule_reassignments
  FOR SELECT
  USING (public.user_has_role(array['gestor','instalador']::user_role[]));

DROP POLICY IF EXISTS reassign_insert ON public.schedule_reassignments;
CREATE POLICY reassign_insert ON public.schedule_reassignments
  FOR INSERT
  WITH CHECK (public.user_has_role(array['gestor','instalador']::user_role[]));

-- UPDATE e DELETE: ninguém — é auditoria

-- 3) builder_rules: regras compiladas do workflow
ALTER TABLE public.builder_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS builder_rules_select ON public.builder_rules;
CREATE POLICY builder_rules_select ON public.builder_rules
  FOR SELECT
  USING (public.user_has_role(array['gestor','instalador']::user_role[]));

DROP POLICY IF EXISTS builder_rules_insert ON public.builder_rules;
CREATE POLICY builder_rules_insert ON public.builder_rules
  FOR INSERT
  WITH CHECK (public.user_has_role(array['gestor','instalador']::user_role[]));

DROP POLICY IF EXISTS builder_rules_update ON public.builder_rules;
CREATE POLICY builder_rules_update ON public.builder_rules
  FOR UPDATE
  USING (public.user_has_role(array['gestor','instalador']::user_role[]))
  WITH CHECK (public.user_has_role(array['gestor','instalador']::user_role[]));

DROP POLICY IF EXISTS builder_rules_delete ON public.builder_rules;
CREATE POLICY builder_rules_delete ON public.builder_rules
  FOR DELETE
  USING (public.user_has_role(array['gestor','instalador']::user_role[]));
