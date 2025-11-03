-- Muda hora_at para array de time, preservando valores existentes como singleton
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='kanban_cards' and column_name='hora_at' 
      and data_type='time without time zone'
  ) then
    alter table public.kanban_cards
      alter column hora_at type time[] using (
        case
          when hora_at is null then null::time[]
          else array[hora_at]::time[]
        end
      );
  end if;
end $$;

-- Índice para consultas de contains
create index if not exists kanban_cards_hora_at_gin on public.kanban_cards using gin (hora_at);

select pg_notify('pgrst','reload schema');
