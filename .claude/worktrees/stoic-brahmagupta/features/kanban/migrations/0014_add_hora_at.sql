-- Add hora_at column to kanban_cards to store appointment time (HH:MM)

alter table if exists public.kanban_cards
  add column if not exists hora_at time;

-- Helpful index for filtering by time
create index if not exists idx_kanban_cards_hora_at on public.kanban_cards (hora_at);
