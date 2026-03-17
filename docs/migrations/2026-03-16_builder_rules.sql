-- Builder rules compilation and validation RPCs

-- 1) Tabela de regras derivadas do workflow publicado
create table if not exists public.builder_rules (
  workflow_id uuid not null references public.builder_workflows(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete cascade,
  priority_label text null,
  priority_rank int null,
  route_name text null,
  route_rank int null
);

do $$ begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='builder_rules' and column_name='route_rank'
  ) then
    alter table public.builder_rules add column route_rank int null;
  end if;
end $$;

create index if not exists idx_builder_rules_workflow on public.builder_rules(workflow_id);
create index if not exists idx_builder_rules_priority on public.builder_rules(priority_label);
create index if not exists idx_builder_rules_route on public.builder_rules(route_name);
create index if not exists idx_builder_rules_route_rank on public.builder_rules(route_rank);
create index if not exists idx_builder_rules_tech on public.builder_rules(technician_id);

-- 2) Normalizador simples de label de prioridade (ui -> canônico)
create or replace function public.norm_priority(p_label text)
returns text language sql immutable as $$
  select trim(lower(coalesce(p_label,'')))
$$;

create or replace function public.norm_text(p text)
returns text language sql immutable as $$
  select trim(lower(coalesce(p,'')))
$$;

-- 3) Compilador do workflow em regras. Versão simplificada: combinações entre nós de technician/priority/route.
create or replace function public.compile_builder_workflow(p_workflow_id uuid)
returns void language plpgsql as $$
declare
  wf record;
  tech_ids uuid[] := array[]::uuid[];
  priorities text[] := array[]::text[];
  n jsonb;
  arr jsonb;
  i int;
  t uuid;
  route_node_rank int := 0;
  j int;
  route_val text;
begin
  select * into wf from public.builder_workflows where id = p_workflow_id and deleted_at is null;
  if wf.id is null then raise exception 'workflow não encontrado'; end if;

  delete from public.builder_rules where workflow_id = p_workflow_id;

  -- Passo 1: coletar técnicos e prioridades
  for n in select * from jsonb_array_elements(coalesce(wf.state->'nodes','[]'::jsonb)) loop
    if (n->>'type') = 'technician' then
      arr := coalesce(n->'data'->'technicianIds','[]'::jsonb);
      for i in 0..(jsonb_array_length(arr)-1) loop
        tech_ids := array_append(tech_ids, (arr->>i)::uuid);
      end loop;
    elsif (n->>'type') = 'priority' then
      arr := coalesce(n->'data'->'priorities','[]'::jsonb);
      for i in 0..(jsonb_array_length(arr)-1) loop
        priorities := array_append(priorities, norm_priority(arr->>i));
      end loop;
    end if;
  end loop;

  -- Dedup
  tech_ids := (select array_agg(distinct x) from unnest(tech_ids) x);
  priorities := (select array_agg(distinct x) from unnest(priorities) x);

  if tech_ids is null or array_length(tech_ids,1) is null then
    raise exception 'workflow sem técnicos';
  end if;
  if priorities is null or array_length(priorities,1) is null then
    priorities := array[null::text];
  end if;

  -- Passo 2: gerar regras por quadro de rota na ordem de criação (rank)
  for n in select * from jsonb_array_elements(coalesce(wf.state->'nodes','[]'::jsonb)) loop
    if (n->>'type') = 'route' then
      route_node_rank := route_node_rank + 1;
      arr := coalesce(n->'data'->'routes','[]'::jsonb);
      if jsonb_array_length(arr) = 0 then
        -- wildcard de rota para este quadro
        for i in 1..coalesce(array_length(priorities,1),1) loop
          foreach t in array tech_ids loop
            insert into public.builder_rules(workflow_id, technician_id, priority_label, priority_rank, route_name, route_rank)
            values (p_workflow_id, t, priorities[i], i, null, route_node_rank);
          end loop;
        end loop;
      else
        for j in 0..(jsonb_array_length(arr)-1) loop
          route_val := trim(arr->>j);
          for i in 1..coalesce(array_length(priorities,1),1) loop
            foreach t in array tech_ids loop
              insert into public.builder_rules(workflow_id, technician_id, priority_label, priority_rank, route_name, route_rank)
              values (p_workflow_id, t, priorities[i], i, route_val, route_node_rank);
            end loop;
          end loop;
        end loop;
      end if;
    end if;
  end loop;

  -- Se não houver nenhum quadro de rota, cria wildcard geral
  if not exists (select 1 from public.builder_rules where workflow_id = p_workflow_id) then
    for i in 1..coalesce(array_length(priorities,1),1) loop
      foreach t in array tech_ids loop
        insert into public.builder_rules(workflow_id, technician_id, priority_label, priority_rank, route_name, route_rank)
        values (p_workflow_id, t, priorities[i], i, null, null);
      end loop;
    end loop;
  end if;
end $$;

-- 4) Publicar e compilar: atualiza publish e compila regras
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
  else
    delete from public.builder_rules where workflow_id = rec.id;
  end if;
  return rec;
end $$;

-- 5) Elegibilidade de técnicos
create or replace function public.eligible_technicians(p_card_id uuid)
returns setof public.technicians language sql stable as $$
  with base as (
    select c.id, c.tipo_instalacao, a.bairro, bw.id as wid
    from public.kanban_cards c
    join public.applicants a on a.id = c.applicant_id
    join public.builder_workflows bw on bw.published_at is not null
    where c.id = p_card_id
    order by bw.published_at desc
    limit 1
  )
  select t.* from base b
  join public.builder_rules r on r.workflow_id = b.wid
    and (r.priority_label is null or r.priority_label = public.norm_priority(b.tipo_instalacao))
    and (r.route_name is null or public.norm_text(r.route_name) = public.norm_text(b.bairro))
  join public.technicians t on t.id = r.technician_id and t.active = true and t.deleted_at is null
  where (
    t.routes is null or array_length(t.routes,1) is null
    or exists (
      select 1 from unnest(t.routes) as rname
      where public.norm_text(rname) = public.norm_text(b.bairro)
    )
  )
$$;

-- 6) Validação do movimento
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
  -- elegibilidade por regras
  ok := exists (
    select 1 from public.eligible_technicians(p_card_id) et where et.id = p_technician_id
  );
  if not ok then raise exception 'Regras do Builder não permitem este técnico (prioridade/rota)'; end if;
  -- capacidade/conflitos: reservado para futura extensão
  return;
end $$;
