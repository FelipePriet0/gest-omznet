-- ============================================================
-- Migration: Workflow-directed matching (priority/route per technician)
-- Date: 2026-03-19
-- Description:
--   Align server-side matching with Canvas law (directed edges +
--   per-tech priority order from Priority node inspector).
--   - Priority/route constraints are per technician and only apply if
--     reachable via arrow direction (from -> to) starting at the tech node.
--   - Priority rank comes from the order of inputs inside the Priority node
--     (first = 0, second = 1, ...). The first label that matches tipo_instalação
--     defines the best rank for that technician.
--   - If a technician has no reachable Priority nodes, priority is not
--     constrained for that tech. Same for Route nodes.
-- ============================================================

-- Suggestion RPC using builder_workflows.state (JSON) with directed traversal
create or replace function public.suggest_assignment(
  p_applicant_id    uuid    default null,
  p_date            date    default current_date,
  p_tipo_instalacao text    default null
)
returns table(technician_id uuid, time_slot text, reason text)
language plpgsql stable
security definer
as $$
declare
  v_bairro    text;
  v_wf_id     uuid;
  v_state     jsonb;
  v_day_start timestamptz;
  v_day_end   timestamptz;
  v_slots     text[] := array['08:30','10:30','13:30','15:30'];
  v_slot      text;
  v_slot_full text;
  v_tech_id   uuid;
begin
  -- Normalize applicant bairro
  select public.norm_text(a.bairro) into v_bairro
  from public.applicants a where a.id = p_applicant_id;

  -- Latest published workflow
  select id, state into v_wf_id, v_state
  from public.builder_workflows
  where published_at is not null and deleted_at is null
  order by published_at desc
  limit 1;

  v_day_start := (p_date::timestamp at time zone 'UTC');
  v_day_end   := v_day_start + interval '1 day';

  if v_wf_id is not null and v_state is not null then
    return query
    with
    nodes as (
      select
        (n->>'id')::text as id,
        (n->>'type')::text as type,
        n->'data'->'technicianIds' as techs,
        n->'data'->'priorities'   as priorities,
        n->'data'->'routes'       as routes
      from jsonb_array_elements(coalesce(v_state->'nodes','[]'::jsonb)) n
    ),
    edges as (
      select
        (e->'from'->>'nodeId')::text as from_id,
        (e->'to'->>'nodeId')::text   as to_id
      from jsonb_array_elements(coalesce(v_state->'edges','[]'::jsonb)) e
    ),
    tech_nodes as (
      select n.id as node_id,
             (jsonb_array_elements_text(coalesce(n.techs,'[]'::jsonb)))::uuid as technician_id
      from nodes n where n.type = 'technician'
    ),
    reach as (
      with recursive r(tech_node_id, node_id) as (
        select tn.node_id, tn.node_id from tech_nodes tn
        union
        select r.tech_node_id, e.to_id
        from r
        join edges e on e.from_id = r.node_id
      ) select r.tech_node_id, r.node_id from r
    ),
    reach_priority as (
      select distinct tn.technician_id, pnode.id as prio_node_id, pnode.priorities
      from reach r
      join nodes pnode on pnode.id = r.node_id and pnode.type = 'priority'
      join tech_nodes tn on tn.node_id = r.tech_node_id
    ),
    rank_for_tech as (
      select technician_id, min(ord - 1) as best_rank
      from (
        select rp.technician_id, lower(trim(val)) as lbl, ord
        from reach_priority rp
        cross join jsonb_array_elements_text(coalesce(rp.priorities, '[]'::jsonb)) with ordinality as t(val, ord)
      ) s
      where lbl <> '' and p_tipo_instalacao is not null
        and lbl like ('%' || lower(trim(p_tipo_instalacao)) || '%')
      group by technician_id
    ),
    has_priority as (
      select tn.technician_id, (count(*) > 0) as has_prio
      from reach r
      join nodes pn on pn.id = r.node_id and pn.type = 'priority'
      join tech_nodes tn on tn.node_id = r.tech_node_id
      group by tn.technician_id
    ),
    reach_routes as (
      select distinct tn.technician_id, rn.id as route_node_id, val as route_name
      from reach r
      join nodes rn on rn.id = r.node_id and rn.type = 'route'
      join tech_nodes tn on tn.node_id = r.tech_node_id
      cross join jsonb_array_elements_text(coalesce(rn.routes, '[]'::jsonb)) as t(val)
    ),
    route_ok as (
      select t.technician_id,
             case
               when exists (select 1 from reach_routes rr where rr.technician_id = t.technician_id)
                 then exists (
                   select 1 from reach_routes rr
                   where rr.technician_id = t.technician_id
                     and public.norm_text(rr.route_name) = v_bairro
                 )
               else true
             end as ok
      from (select distinct technician_id from tech_nodes) t
    ),
    eligible as (
      select
        t.technician_id,
        coalesce(rft.best_rank, 1000000) as best_rank,
        (case when hp.has_prio is true then (rft.best_rank is not null) else true end) as priority_ok,
        ro.ok as route_ok
      from (select distinct technician_id from tech_nodes) t
      left join rank_for_tech rft on rft.technician_id = t.technician_id
      left join has_priority hp on hp.technician_id = t.technician_id
      join route_ok ro on ro.technician_id = t.technician_id
      join public.technicians tch on tch.id = t.technician_id and tch.active = true and tch.deleted_at is null
    ),
    ordered_pool as (
      select technician_id
      from eligible
      where priority_ok and route_ok
      order by best_rank asc, technician_id asc
    )
    select
      op.technician_id,
      v_slots[i] as time_slot,
      'matched_workflow'::text as reason
    from ordered_pool op
    cross join lateral (
      select i
      from generate_subscripts(v_slots, 1) as i
      where not exists (
        select 1 from public.kanban_cards kc
        where kc.technician_id = op.technician_id
          and kc.due_at >= v_day_start
          and kc.due_at <  v_day_end
          and kc.deleted_at is null
          and kc.hora_at @> array[v_slots[i] || ':00']
      )
      order by i asc
      limit 1
    ) pick;
    if found then return; end if;
  end if;

  -- Fallback: all active technicians, earliest free slot
  for v_tech_id in
    select t.id from public.technicians t
    where t.active = true and t.deleted_at is null
    order by t.name
  loop
    foreach v_slot in array v_slots loop
      v_slot_full := v_slot || ':00';
      if not exists (
        select 1 from public.kanban_cards kc
        where kc.technician_id = v_tech_id
          and kc.due_at >= v_day_start
          and kc.due_at <  v_day_end
          and kc.deleted_at is null
          and kc.hora_at @> array[v_slot_full]
      ) then
        return query select v_tech_id, v_slot, 'fallback_all_techs'::text;
        return;
      end if;
    end loop;
  end loop;

  -- No free slot: first active tech + first slot
  select t.id into v_tech_id
  from public.technicians t
  where t.active = true and t.deleted_at is null
  order by t.name
  limit 1;

  if v_tech_id is not null then
    return query select v_tech_id, v_slots[1], 'no_free_slot'::text;
  end if;
end $$;

grant execute on function public.suggest_assignment(uuid, date, text) to authenticated;

-- Eligible technicians via suggest_assignment (optional – keeps validate_move consistent)
create or replace function public.eligible_technicians(p_card_id uuid)
returns setof public.technicians
language plpgsql stable
as $$
declare
  v_applicant_id uuid;
  v_tipo         text;
begin
  select c.applicant_id, c.tipo_instalacao
    into v_applicant_id, v_tipo
  from public.kanban_cards c
  where c.id = p_card_id;

  return query
    select s.technician_id as id, t.name, t.activity, t.available_start, t.available_end, t.active
    from public.suggest_assignment(v_applicant_id, current_date, v_tipo) s
    join public.technicians t on t.id = s.technician_id;
end $$;

-- Validate move with directed eligibility
create or replace function public.validate_move(p_card_id uuid, p_technician_id uuid, p_date date, p_time_slot text)
returns void language plpgsql as $$
declare
  t public.technicians;
  ok boolean := false;
begin
  select * into t from public.technicians where id = p_technician_id and active = true and deleted_at is null;
  if t.id is null then raise exception 'Técnico inválido'; end if;
  if t.available_start is not null and p_date < t.available_start then raise exception 'Fora da disponibilidade'; end if;
  if t.available_end is not null and p_date > t.available_end then raise exception 'Fora da disponibilidade'; end if;

  ok := exists (
    select 1 from public.eligible_technicians(p_card_id) et where et.id = p_technician_id
  );
  if not ok then raise exception 'Regras do Builder não permitem este técnico (prioridade/rota)'; end if;
  return;
end $$;

