-- Dashboard counts for Kanban without creating new tables/columns
-- Aggregates directly from public.kanban_cards

create or replace function public.dashboard_kanban_counts(p_area text, p_now timestamptz default now())
returns table(
  feitas_aguardando_count bigint,
  canceladas_count bigint,
  concluidas_count bigint,
  atrasadas_count bigint,
  recebidos_count bigint,
  em_analise_count bigint,
  reanalise_count bigint,
  finalizados_count bigint,
  analise_canceladas_count bigint
)
language sql
set search_path = public
as $$
  with base as (
    select *
    from public.kanban_cards kc
    where kc.deleted_at is null
      and lower(kc.area::text) = lower(coalesce(p_area,''))
  )
  select
    -- Comercial
    sum( case when lower(stage) in ('feitas','aguardando') then 1 else 0 end )::bigint as feitas_aguardando_count,
    sum( case when lower(stage) = 'canceladas' then 1 else 0 end )::bigint as canceladas_count,
    sum( case when lower(stage) = 'concluidas' then 1 else 0 end )::bigint as concluidas_count,
    sum( case when lower(stage) in ('feitas','aguardando') and due_at < p_now then 1 else 0 end )::bigint as atrasadas_count,
    -- Análise
    sum( case when lower(stage) = 'recebidos' then 1 else 0 end )::bigint as recebidos_count,
    sum( case when lower(stage) = 'em_analise' then 1 else 0 end )::bigint as em_analise_count,
    sum( case when lower(stage) = 'reanalise' then 1 else 0 end )::bigint as reanalise_count,
    sum( case when lower(stage) = 'finalizados' then 1 else 0 end )::bigint as finalizados_count,
    sum( case when lower(stage) = 'canceladas' then 1 else 0 end )::bigint as analise_canceladas_count
  from base;
$$;

grant execute on function public.dashboard_kanban_counts(text, timestamptz) to anon, authenticated;
select pg_notify('pgrst','reload schema');
