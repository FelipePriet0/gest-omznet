-- Configurar REPLICA IDENTITY FULL para inbox_notifications
-- Isso garante que o Supabase Realtime envie os dados completos nas mudanças

begin;

-- Configurar REPLICA IDENTITY FULL para garantir que realtime funcione corretamente
-- Isso permite que o Supabase Realtime envie os dados completos nas mudanças
alter table public.inbox_notifications replica identity full;

commit;

