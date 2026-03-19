-- ============================================================
-- Migration: Ativo/Inativo para Workflows e Técnicos
-- Data: 2026-03-17
-- ============================================================

-- 1) Coluna active em builder_workflows
alter table public.builder_workflows
  add column if not exists active boolean not null default true;

-- 2) RPC: ativar / desativar workflow
create or replace function public.toggle_workflow_active(p_id uuid, p_active boolean)
returns public.builder_workflows language plpgsql as $$
declare rec public.builder_workflows;
begin
  update public.builder_workflows
     set active = p_active, updated_at = now()
   where id = p_id and deleted_at is null
  returning * into rec;
  if rec.id is null then raise exception 'workflow não encontrado'; end if;
  return rec;
end $$;

-- 3) RPC: soft-delete de workflow
create or replace function public.delete_builder_workflow(p_id uuid)
returns void language plpgsql as $$
begin
  update public.builder_workflows
     set deleted_at = now(), active = false
   where id = p_id;
end $$;

-- 4) RPC: ativar / desativar técnico (vincula ao toggle On/Off da UI)
create or replace function public.toggle_technician_active(p_id uuid, p_active boolean)
returns public.technicians language plpgsql as $$
declare rec public.technicians;
begin
  update public.technicians
     set active = p_active, updated_at = now()
   where id = p_id and deleted_at is null
  returning * into rec;
  if rec.id is null then raise exception 'técnico não encontrado'; end if;
  return rec;
end $$;

-- 5) RPC: soft-delete de técnico
create or replace function public.delete_technician(p_id uuid)
returns void language plpgsql as $$
begin
  update public.technicians
     set deleted_at = now(), active = false
   where id = p_id;
end $$;

-- 6) RPC: editar dados do técnico
create or replace function public.update_technician_info(
  p_id       uuid,
  p_name     text,
  p_activity text default null,
  p_start    date default null,
  p_end      date default null
)
returns public.technicians language plpgsql as $$
declare rec public.technicians;
begin
  update public.technicians
     set name            = p_name,
         activity        = p_activity,
         available_start = p_start,
         available_end   = p_end,
         updated_at      = now()
   where id = p_id and deleted_at is null
  returning * into rec;
  if rec.id is null then raise exception 'técnico não encontrado'; end if;
  return rec;
end $$;

-- 7) Re-criar suggest_assignment para respeitar active = true nos workflows
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
  v_bairro      text;
  v_wf_id       uuid;
  v_slots       text[] := array['08:30','10:30','13:30','15:30'];
  v_slot        text;
  v_slot_full   text;
  v_tech_id     uuid;
  v_day_start   timestamptz;
  v_day_end     timestamptz;
begin
  select public.norm_text(a.bairro) into v_bairro
    from public.applicants a where a.id = p_applicant_id;

  -- Apenas o workflow ATIVO mais recente
  select bw.id into v_wf_id
    from public.builder_workflows bw
   where bw.published_at is not null
     and bw.deleted_at   is null
     and bw.active       = true
   order by bw.published_at desc
   limit 1;

  v_day_start := (p_date::timestamp at time zone 'UTC');
  v_day_end   := v_day_start + interval '1 day';

  -- Candidatos pelo workflow ativo
  if v_wf_id is not null then
    for v_tech_id in
      select distinct r.technician_id
        from public.builder_rules r
        join public.technicians t on t.id = r.technician_id
                                  and t.active = true
                                  and t.deleted_at is null
       where r.workflow_id = v_wf_id
         and (r.priority_label is null or r.priority_label = public.norm_priority(p_tipo_instalacao))
         and (r.route_name    is null or public.norm_text(r.route_name) = v_bairro)
       order by r.technician_id
    loop
      foreach v_slot in array v_slots loop
        v_slot_full := v_slot || ':00';
        if not exists (
          select 1 from public.kanban_cards kc
           where kc.technician_id = v_tech_id
             and kc.due_at >= v_day_start and kc.due_at < v_day_end
             and kc.deleted_at is null
             and kc.hora_at @> array[v_slot_full]
        ) then
          return query select v_tech_id, v_slot, 'matched_workflow'::text;
          return;
        end if;
      end loop;
    end loop;
  end if;

  -- Fallback: todos os técnicos ativos
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
           and kc.due_at >= v_day_start and kc.due_at < v_day_end
           and kc.deleted_at is null
           and kc.hora_at @> array[v_slot_full]
      ) then
        return query select v_tech_id, v_slot, 'fallback_all_techs'::text;
        return;
      end if;
    end loop;
  end loop;

  -- Último recurso: primeiro técnico ativo + primeiro slot
  select t.id into v_tech_id from public.technicians t
   where t.active = true and t.deleted_at is null order by t.name limit 1;
  if v_tech_id is not null then
    return query select v_tech_id, v_slots[1], 'no_free_slot'::text;
  end if;
end $$;

-- Grants
grant execute on function public.toggle_workflow_active(uuid, boolean)            to authenticated;
grant execute on function public.delete_builder_workflow(uuid)                    to authenticated;
grant execute on function public.toggle_technician_active(uuid, boolean)          to authenticated;
grant execute on function public.delete_technician(uuid)                          to authenticated;
grant execute on function public.update_technician_info(uuid, text, text, date, date) to authenticated;
grant execute on function public.suggest_assignment(uuid, date, text)             to authenticated;
