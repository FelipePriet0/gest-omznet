-- Historico: view + RPCs for listing and details (DB-first)

-- View of finalized (archived) cards with enriched fields
do $$ begin
  create or replace view public.v_historico_cards as
  select
    kc.id,
    kc.applicant_id,
    a.primary_name as applicant_name,
    a.cpf_cnpj,
    kc.final_decision,
    kc.finalized_at,
    kc.archived_at,
    kc.created_by as vendedor_id,
    pv.full_name as vendedor_name,
    kc.assignee_id as analista_id,
    pa.full_name as analista_name
  from public.kanban_cards kc
  join public.applicants a on a.id = kc.applicant_id
  left join public.profiles pv on pv.id = kc.created_by
  left join public.profiles pa on pa.id = kc.assignee_id
  where kc.area = 'analise' and kc.stage = 'finalizados' and kc.archived_at is not null
  ;
exception when others then null; end $$;

-- Allow read to all authenticated via RLS on base tables; provide RPC for filtering
do $$ begin
  create or replace function public.list_historico(
    p_search text default null,
    p_date_start timestamptz default null,
    p_date_end timestamptz default null,
    p_status text default null,
    p_responsavel uuid default null
  )
  returns setof public.v_historico_cards
  language sql
  security definer
  set search_path = public
  as $fn$
    select * from public.v_historico_cards h
    where (p_search is null or unaccent(h.applicant_name) ilike unaccent('%'||p_search||'%'))
      and (p_status is null or h.final_decision = p_status)
      and (p_responsavel is null or h.analista_id = p_responsavel)
      and (p_date_start is null or h.finalized_at >= p_date_start)
      and (p_date_end is null or h.finalized_at <= p_date_end)
    order by h.finalized_at desc nulls last
  $fn$;
exception when others then null; end $$;

-- Details RPC: returns a JSON with applicant + equipe + pareceres (notes)
do $$ begin
  create or replace function public.get_historico_details(p_card_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $fn$
  declare
    v jsonb;
    r record;
  begin
    select
      jsonb_build_object(
        'card', to_jsonb(kc) - 'record_snapshot',
        'applicant', to_jsonb(a),
        'vendedor', (select to_jsonb(pv) from public.profiles pv where pv.id = kc.created_by),
        'analista', (select to_jsonb(pa) from public.profiles pa where pa.id = kc.assignee_id),
        'pareceres', coalesce(kc.reanalysis_notes, '[]'::jsonb)
      )
    into v
    from public.kanban_cards kc
    join public.applicants a on a.id = kc.applicant_id
    where kc.id = p_card_id and kc.area = 'analise' and kc.stage = 'finalizados';
    return v;
  end;
  $fn$;
exception when others then null; end $$;
