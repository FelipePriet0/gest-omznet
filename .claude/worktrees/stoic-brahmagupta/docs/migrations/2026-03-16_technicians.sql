-- Technicians: recursos de campo (não usuários)

create table if not exists public.technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  activity text null,
  available_start date null,
  available_end date null,
  routes text[] null,
  capacity jsonb null,
  active boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_technicians_active on public.technicians(active) where deleted_at is null;

create or replace function public.set_updated_at_generic()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_technicians_updated_at') then
    create trigger trg_technicians_updated_at before update on public.technicians
      for each row execute function public.set_updated_at_generic();
  end if;
end $$;

alter table if exists public.technicians enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='technicians' and policyname='technicians_select') then
    create policy technicians_select on public.technicians for select using (auth.uid() is not null);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='technicians' and policyname='technicians_write_installacao') then
    create policy technicians_write_installacao on public.technicians
      for all using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and lower((p.role)::text) in ('instalacao','instalação','instalador','gestor')
        )
      ) with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and lower((p.role)::text) in ('instalacao','instalação','instalador','gestor')
        )
      );
  end if;
end $$;

-- FK em kanban_cards para o técnico de campo
do $$ begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='kanban_cards' and column_name='technician_id'
  ) then
    alter table public.kanban_cards add column technician_id uuid null references public.technicians(id);
    create index if not exists idx_kanban_cards_technician on public.kanban_cards(technician_id);
  end if;
end $$;

-- RPCs
create or replace function public.create_technician(p_name text, p_activity text, p_start date, p_end date)
returns public.technicians language plpgsql as $$
declare rec public.technicians; begin
  insert into public.technicians(name, activity, available_start, available_end, created_by)
  values (p_name, p_activity, p_start, p_end, auth.uid())
  returning * into rec;
  return rec;
end $$;

create or replace function public.list_technicians(p_active_only boolean default true)
returns setof public.technicians language sql stable as $$
  select * from public.technicians
  where deleted_at is null and (not p_active_only or active)
  order by name;
$$;

create or replace function public.update_technician(p_id uuid, p_patch jsonb)
returns public.technicians language plpgsql as $$
declare rec public.technicians; begin
  update public.technicians set
    name = coalesce((p_patch->>'name')::text, name),
    activity = coalesce((p_patch->>'activity')::text, activity),
    available_start = coalesce((p_patch->>'available_start')::date, available_start),
    available_end = coalesce((p_patch->>'available_end')::date, available_end),
    active = coalesce((p_patch->>'active')::boolean, active)
  where id = p_id and deleted_at is null
  returning * into rec;
  return rec;
end $$;

create or replace function public.deactivate_technician(p_id uuid)
returns void language sql as $$
  update public.technicians set active = false where id = p_id;
$$;

-- Move schedule: valida e atualiza de forma atômica
create or replace function public.move_schedule(p_card_id uuid, p_date date, p_time_slot text, p_technician_id uuid)
returns void language plpgsql as $$
declare
  tech public.technicians;
begin
  select * into tech from public.technicians where id = p_technician_id and active = true and deleted_at is null;
  if tech.id is null then raise exception 'Técnico inválido'; end if;
  if tech.available_start is not null and p_date < tech.available_start then raise exception 'Fora da disponibilidade'; end if;
  if tech.available_end is not null and p_date > tech.available_end then raise exception 'Fora da disponibilidade'; end if;

  update public.kanban_cards
    set technician_id = p_technician_id,
        due_at = make_timestamptz(extract(year from p_date)::int, extract(month from p_date)::int, extract(day from p_date)::int, 12, 0, 0),
        hora_at = array[p_time_slot || ':00']
  where id = p_card_id;
end $$;

create or replace function public.update_schedule_meta(p_card_id uuid, p_tipo_instalacao text)
returns void language sql as $$
  update public.kanban_cards set tipo_instalacao = p_tipo_instalacao where id = p_card_id;
$$;

-- Realtime
do $$ begin
  perform 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='technicians';
  if not found then
    alter publication supabase_realtime add table public.technicians;
  end if;
end $$;

