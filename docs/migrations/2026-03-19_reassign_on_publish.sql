-- ============================================================
-- Migration: Auto-reassignment on workflow publish (24/7 agenda)
-- Date: 2026-03-19
-- Description:
--   - Track assignment origin (auto/manual) on kanban_cards
--   - Reassign future cards automatically after publishing a workflow
--     using suggest_assignment (directed by Canvas)
--   - Never override manual decisions (assign_origin='manual')
--   - Optional audit table for reassignment logs
-- ============================================================

-- 1) Assign origin tracking
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='kanban_cards' and column_name='assign_origin'
  ) then
    alter table public.kanban_cards
      add column assign_origin text check (assign_origin in ('auto','manual')) default null;
  end if;
end $$;

-- 2) Audit table (optional)
create table if not exists public.schedule_reassignments (
  card_id     uuid not null references public.kanban_cards(id) on delete cascade,
  old_tech    uuid null references public.technicians(id) on delete set null,
  new_tech    uuid null references public.technicians(id) on delete set null,
  old_slot    text null,
  new_slot    text null,
  reason      text null,
  created_at  timestamptz not null default now()
);

-- 3) Update create_schedule_with_matching to mark auto assignments
create or replace function public.create_schedule_with_matching(
  p_applicant_id    uuid,
  p_date            date,
  p_tipo_instalacao text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_tech_id     uuid;
  v_slot        text;
  v_slot_full   text;
  v_due_at      timestamptz;
  v_person_type text;
  v_card_id     uuid;
  v_day_start   timestamptz;
  v_day_end     timestamptz;
begin
  -- 1) Obter sugestão de técnico e slot
  select s.technician_id, s.time_slot
    into v_tech_id, v_slot
    from public.suggest_assignment(p_applicant_id, p_date, p_tipo_instalacao) s
   limit 1;

  if v_tech_id is null then
    raise exception 'Nenhum técnico disponível para o agendamento solicitado';
  end if;

  v_slot_full := v_slot || ':00';
  v_due_at    := (p_date::timestamp at time zone 'UTC') + interval '12 hours';
  v_day_start := (p_date::timestamp at time zone 'UTC');
  v_day_end   := v_day_start + interval '1 day';

  -- 2) Verificar concorrência: o slot ainda está livre?
  if exists (
    select 1
      from public.kanban_cards kc
     where kc.technician_id = v_tech_id
       and kc.due_at >= v_day_start
       and kc.due_at <  v_day_end
       and kc.deleted_at is null
       and kc.hora_at @> array[v_slot_full]
  ) then
    raise exception 'Conflito de slot detectado (concorrência). Tente novamente.'
      using hint = 'slot_conflict';
  end if;

  -- 3) Obter person_type do solicitante
  select coalesce(a.person_type, 'PF')
    into v_person_type
    from public.applicants a
   where a.id = p_applicant_id;

  -- 4) Inserir card (assign_origin = 'auto')
  insert into public.kanban_cards (
    applicant_id,
    technician_id,
    due_at,
    hora_at,
    tipo_instalacao,
    person_type,
    area,
    stage,
    assign_origin,
    created_by
  ) values (
    p_applicant_id,
    v_tech_id,
    v_due_at,
    array[v_slot_full],
    p_tipo_instalacao,
    v_person_type,
    'analise',
    'em_analise',
    'auto',
    auth.uid()
  )
  returning id into v_card_id;

  return v_card_id;
end $$;

-- 4) Reconciliação automática após publicar workflow
create or replace function public.reassign_by_workflow(
  p_date_from date default current_date,
  p_date_to   date default current_date + 30,
  p_max       int  default 100
)
returns void language plpgsql as $$
declare
  rec record;
  v_sug_tech uuid;
  v_sug_slot text;
  v_slot_full text;
  v_day_start timestamptz;
  v_day_end   timestamptz;
  v_count int := 0;
begin
  for rec in
    select c.id, c.technician_id, c.hora_at, c.due_at::date as d,
           c.stage, c.assign_origin, c.applicant_id, c.tipo_instalacao
    from public.kanban_cards c
    where c.deleted_at is null
      and c.due_at is not null
      and c.due_at::date between p_date_from and p_date_to
      and lower(coalesce(c.stage,'')) in ('recebidos','em_analise')
      and coalesce(c.assign_origin,'auto') <> 'manual' -- não tocar em manual
  loop
    -- 1) Nova sugestão
    select s.technician_id, s.time_slot into v_sug_tech, v_sug_slot
    from public.suggest_assignment(rec.applicant_id, rec.d, rec.tipo_instalacao) s
    limit 1;

    if v_sug_tech is null or v_sug_slot is null then
      continue; -- sem sugestão
    end if;

    v_day_start := (rec.d::timestamp at time zone 'UTC');
    v_day_end   := v_day_start + interval '1 day';
    v_slot_full := v_sug_slot || ':00';

    -- 2) Se igual ao atual, seguir
    if rec.technician_id is not distinct from v_sug_tech
       and array[v_slot_full] <@ coalesce(rec.hora_at, array[]::text[])
    then
      continue;
    end if;

    -- 3) Checar conflito no slot
    if exists (
      select 1 from public.kanban_cards kc
      where kc.deleted_at is null
        and kc.technician_id = v_sug_tech
        and kc.due_at >= v_day_start and kc.due_at < v_day_end
        and kc.hora_at @> array[v_slot_full]
        and kc.id <> rec.id
    ) then
      continue; -- conflito; não reatribuir
    end if;

    -- 4) Aplicar reatribuição (respeitando limitador)
    if p_max is not null and v_count >= p_max then
      exit;
    end if;
    update public.kanban_cards
       set technician_id = v_sug_tech,
           hora_at       = array[v_slot_full],
           assign_origin = 'auto'
     where id = rec.id;

    insert into public.schedule_reassignments(card_id, old_tech, new_tech, old_slot, new_slot, reason)
    values (rec.id, rec.technician_id, v_sug_tech,
            (case when rec.hora_at is not null and array_length(rec.hora_at,1)>0 then rec.hora_at[1] else null end),
            v_slot_full,
            'workflow_publish');
    v_count := v_count + 1;
  end loop;
end $$;

-- 5) Hook no publish: recompilar e reatribuir
create or replace function public.publish_builder_workflow(p_id uuid, p_publish boolean default true)
returns public.builder_workflows language plpgsql as $$
declare rec public.builder_workflows; begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role::text,'')) in ('admin','coordenador','gestor','instalacao','instalação')
  ) then
    raise exception 'sem permissão para publicar';
  end if;
  update public.builder_workflows
    set published_at = case when p_publish then now() else null end
  where id = p_id and deleted_at is null
  returning * into rec;
  if rec.id is null then raise exception 'workflow não encontrado'; end if;
  if p_publish then
    perform public.compile_builder_workflow(rec.id);
    perform public.reassign_by_workflow(current_date, current_date + 30, 100);
  else
    delete from public.builder_rules where workflow_id = rec.id;
  end if;
  return rec;
end $$;
