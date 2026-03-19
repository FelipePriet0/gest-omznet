-- kanban_cards: adiciona coluna para o tipo de instalação usado pela Agenda/Builder
-- Safe to run multiple times
alter table if exists public.kanban_cards
  add column if not exists tipo_instalacao text;

-- Opcional: restringe os valores aceitos. Comentar se preferir texto livre ou FK futura
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kanban_cards_tipo_instalacao_check'
  ) then
    alter table public.kanban_cards
      add constraint kanban_cards_tipo_instalacao_check
      check (tipo_instalacao in ('casa','predio_com_prumada','predio_sem_prumada','wifi_extend'));
  end if;
end $$;

-- Índice leve para filtros por tipo (opcional)
create index if not exists idx_kanban_cards_tipo_instalacao on public.kanban_cards (tipo_instalacao);

