-- Enable Supabase Realtime for core tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.applicants;
alter publication supabase_realtime add table public.pf_fichas;
alter publication supabase_realtime add table public.pj_fichas;
alter publication supabase_realtime add table public.kanban_cards;

