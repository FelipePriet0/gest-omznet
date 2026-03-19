-- ============================================================
-- Migration: Matching automático de agendamentos
-- Data: 2026-03-17
-- Descrição: RPCs suggest_assignment e create_schedule_with_matching
--            para escalonar técnico + slot com base no Workflow publicado.
-- ============================================================

-- Índices de performance (idempotentes)
create index if not exists idx_kanban_cards_tech_due
  on public.kanban_cards(technician_id, due_at)
  where deleted_at is null;

-- GIN no array hora_at para lookups rápidos
create index if not exists idx_kanban_cards_hora_at_gin
  on public.kanban_cards using gin(hora_at)
  where deleted_at is null;

-- ============================================================
-- 1. suggest_assignment
--    Lê o último workflow publicado, usa builder_rules já compiladas,
--    cruza bairro + tipo_instalacao e retorna (technician_id, time_slot).
--    Sem side-effects – apenas leitura.
-- ============================================================
create or replace function public.suggest_assignment(
  p_applicant_id   uuid    default null,   -- nullable: null = sem contexto de bairro
  p_date           date    default current_date,
  p_tipo_instalacao text   default null
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
  -- 1) Buscar bairro do solicitante (normalizado)
  select public.norm_text(a.bairro)
    into v_bairro
    from public.applicants a
   where a.id = p_applicant_id;

  -- 2) Último workflow publicado
  select bw.id
    into v_wf_id
    from public.builder_workflows bw
   where bw.published_at is not null
     and bw.deleted_at is null
   order by bw.published_at desc
   limit 1;

  -- 3) Limites do dia em UTC
  v_day_start := (p_date::timestamp at time zone 'UTC');
  v_day_end   := v_day_start + interval '1 day';

  -- -------------------------------------------------------
  -- 4) Candidatos pelo workflow publicado (builder_rules)
  -- -------------------------------------------------------
  if v_wf_id is not null then
    for v_tech_id in
      select distinct r.technician_id
        from public.builder_rules r
        join public.technicians t
          on t.id = r.technician_id
         and t.active = true
         and t.deleted_at is null
       where r.workflow_id = v_wf_id
         -- match de prioridade (tipo_instalacao)
         and (
               r.priority_label is null
               or r.priority_label = public.norm_priority(p_tipo_instalacao)
             )
         -- match de rota (bairro)
         and (
               r.route_name is null
               or public.norm_text(r.route_name) = v_bairro
             )
       order by r.technician_id
    loop
      -- Encontrar primeiro slot livre para este técnico no dia
      foreach v_slot in array v_slots loop
        v_slot_full := v_slot || ':00';
        if not exists (
          select 1
            from public.kanban_cards kc
           where kc.technician_id = v_tech_id
             and kc.due_at >= v_day_start
             and kc.due_at <  v_day_end
             and kc.deleted_at is null
             and kc.hora_at @> array[v_slot_full]
        ) then
          return query select v_tech_id, v_slot, 'matched_workflow'::text;
          return;
        end if;
      end loop;
    end loop;
  end if;

  -- -------------------------------------------------------
  -- 5) Fallback: todos os técnicos ativos (sem restrição de workflow)
  -- -------------------------------------------------------
  for v_tech_id in
    select t.id
      from public.technicians t
     where t.active = true
       and t.deleted_at is null
     order by t.name
  loop
    foreach v_slot in array v_slots loop
      v_slot_full := v_slot || ':00';
      if not exists (
        select 1
          from public.kanban_cards kc
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

  -- -------------------------------------------------------
  -- 6) Sem slot livre: retorna primeiro técnico ativo + primeiro slot
  -- -------------------------------------------------------
  select t.id
    into v_tech_id
    from public.technicians t
   where t.active = true
     and t.deleted_at is null
   order by t.name
   limit 1;

  if v_tech_id is not null then
    return query select v_tech_id, v_slots[1], 'no_free_slot'::text;
  end if;

  -- Nenhum técnico cadastrado – retorna vazio
end $$;

-- ============================================================
-- 2. create_schedule_with_matching
--    Chama suggest_assignment internamente, verifica slot (concorrência)
--    e insere o card em kanban_cards. Retorna o UUID do card criado.
-- ============================================================
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

  -- 4) Inserir card
  insert into public.kanban_cards (
    applicant_id,
    technician_id,
    due_at,
    hora_at,
    tipo_instalacao,
    person_type,
    area,
    stage,
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
    auth.uid()
  )
  returning id into v_card_id;

  return v_card_id;
end $$;

-- Grant de execução para roles autenticadas
grant execute on function public.suggest_assignment(uuid, date, text) to authenticated;
grant execute on function public.create_schedule_with_matching(uuid, date, text) to authenticated;
