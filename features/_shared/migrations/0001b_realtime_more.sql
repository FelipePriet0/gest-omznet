-- Add remaining tables to Supabase Realtime publication
alter publication supabase_realtime add table public.card_comments;
alter publication supabase_realtime add table public.card_attachments;
alter publication supabase_realtime add table public.card_tasks;
alter publication supabase_realtime add table public.inbox_notifications;
alter publication supabase_realtime add table public.deletion_log;

