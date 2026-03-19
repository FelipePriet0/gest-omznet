-- Builder: tabela, RLS, RPCs e referência (rotas/prioridades)

-- 1) Tabela principal de workflows
create table if not exists public.builder_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_builder_workflows_owner on public.builder_workflows(owner_id);
create index if not exists idx_builder_workflows_published on public.builder_workflows(published_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_builder_workflows_updated_at') then
    create trigger trg_builder_workflows_updated_at
      before update on public.builder_workflows
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table if exists public.builder_workflows enable row level security;

-- RLS
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='builder_workflows' and policyname='bw_select') then
    create policy bw_select on public.builder_workflows
      for select to authenticated
      using (published_at is not null or owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='builder_workflows' and policyname='bw_insert') then
    create policy bw_insert on public.builder_workflows
      for insert to authenticated
      with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='builder_workflows' and policyname='bw_update_owner') then
    create policy bw_update_owner on public.builder_workflows
      for update to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='builder_workflows' and policyname='bw_delete_owner') then
    create policy bw_delete_owner on public.builder_workflows
      for delete to authenticated
      using (owner_id = auth.uid());
  end if;
end $$;

-- 2) RPCs
create or replace function public.validate_builder_state(p_state jsonb)
returns void language plpgsql as $$
declare
  ok boolean := true;
begin
  -- validações mínimas: nodes:[], edges:[] presentes
  if p_state ? 'nodes' is false or p_state ? 'edges' is false then
    raise exception 'state inválido: requer nodes e edges';
  end if;
end $$;

create or replace function public.save_builder_workflow(p_id uuid, p_name text, p_state jsonb)
returns public.builder_workflows language plpgsql as $$
declare
  rec public.builder_workflows;
begin
  perform public.validate_builder_state(p_state);
  if p_id is null then
    insert into public.builder_workflows(name, owner_id, state)
    values (coalesce(p_name,'Workflow'), auth.uid(), p_state)
    returning * into rec;
    return rec;
  else
    update public.builder_workflows
      set name = coalesce(p_name, name), state = p_state
    where id = p_id and owner_id = auth.uid()
    returning * into rec;
    if rec.id is null then raise exception 'workflow não encontrado ou sem permissão'; end if;
    return rec;
  end if;
end $$;

create or replace function public.get_builder_workflow(p_id uuid)
returns public.builder_workflows language sql stable as $$
  select * from public.builder_workflows where id = p_id;
$$;

create or replace function public.list_builder_workflows()
returns setof public.builder_workflows language sql stable as $$
  select * from public.builder_workflows
  where (published_at is not null) or (owner_id = auth.uid()) and deleted_at is null
  order by coalesce(published_at, updated_at) desc;
$$;

create or replace function public.publish_builder_workflow(p_id uuid, p_publish boolean default true)
returns public.builder_workflows language plpgsql as $$
declare rec public.builder_workflows; begin
  -- restrição de papel: apenas admin/coordenador/gestor pode publicar
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('admin','coordenador','gestor')
  ) then
    raise exception 'sem permissão para publicar';
  end if;
  update public.builder_workflows
    set published_at = case when p_publish then now() else null end
  where id = p_id and deleted_at is null
  returning * into rec;
  if rec.id is null then raise exception 'workflow não encontrado'; end if;
  return rec;
end $$;

create or replace function public.duplicate_builder_workflow(p_id uuid)
returns uuid language plpgsql as $$
declare new_id uuid; begin
  insert into public.builder_workflows(name, owner_id, state)
    select concat(name,' (cópia)'), auth.uid(), state
    from public.builder_workflows where id = p_id
    returning id into new_id;
  return new_id;
end $$;

-- 3) Realtime
do $$ begin
  perform 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='builder_workflows';
  if not found then
    alter publication supabase_realtime add table public.builder_workflows;
  end if;
end $$;

-- 4) Referências
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists public.priorities (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  rank int not null default 0,
  active boolean not null default true
);

alter table if exists public.routes enable row level security;
alter table if exists public.priorities enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routes' and policyname='routes_select') then
    create policy routes_select on public.routes for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='priorities' and policyname='priorities_select') then
    create policy priorities_select on public.priorities for select to authenticated using (true);
  end if;
end $$;

-- Seeds mínimos (idempotentes)
insert into public.priorities(label, rank)
  select x.label, x.rank
  from (values
    ('Casa', 1),
    ('Prédio com Prumada', 2),
    ('Prédio sem Prumada (+3 andares)', 3),
    ('Wi-Fi Extend', 4)
  ) as x(label, rank)
  on conflict do nothing;

