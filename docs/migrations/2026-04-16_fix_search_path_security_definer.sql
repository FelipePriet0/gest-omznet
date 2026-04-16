-- ============================================================
-- Migration: search_path fixo nas funções SECURITY DEFINER
-- Date: 2026-04-16
-- Impede SQL injection via schema hijacking
-- ============================================================

ALTER FUNCTION public.add_free_row() SET search_path = public;
ALTER FUNCTION public.create_schedule_with_matching(uuid, date, text) SET search_path = public;
ALTER FUNCTION public.criar_ficha_pf_atomic(uuid, text, text, text, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.criar_ficha_pj_atomic(uuid, text, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.delete_free_row(uuid) SET search_path = public;
ALTER FUNCTION public.get_agenda_availability(date, date) SET search_path = public;
ALTER FUNCTION public.set_card_attachment_author() SET search_path = public;
ALTER FUNCTION public.suggest_assignment(uuid, date, text) SET search_path = public;
