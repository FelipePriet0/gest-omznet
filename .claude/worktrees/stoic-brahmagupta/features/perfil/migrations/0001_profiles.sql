-- profiles table and auth sync triggers

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  role user_role not null default 'vendedor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Create profile on new auth user using raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  md jsonb;
  v_role text;
begin
  md := new.raw_user_meta_data;
  v_role := coalesce(md->>'role', 'vendedor');
  insert into public.profiles (id, full_name, role)
  values (new.id, md->>'full_name', v_role::user_role)
  on conflict (id) do nothing;
  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep email/full_name/role in sync if auth.users changes
create or replace function public.sync_profile_from_auth()
returns trigger language plpgsql security definer as $$
declare
  md jsonb;
  v_role text;
begin
  md := new.raw_user_meta_data;
  v_role := coalesce(md->>'role', (select role::text from public.profiles where id = new.id limit 1));
  update public.profiles p
    set full_name = coalesce(md->>'full_name', p.full_name),
        role = coalesce(v_role, 'vendedor')::user_role,
        updated_at = now()
  where p.id = new.id;
  return new;
end;$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.sync_profile_from_auth();

alter table public.profiles enable row level security;

-- Helper: check if current user has any of the given roles (used across RLS policies)
drop function if exists public.user_has_role(user_role[]);
create or replace function public.user_has_role(target_roles user_role[] default array[]::user_role[])
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  roles user_role[] := coalesce(target_roles, array[]::user_role[]);
begin
  return exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and (
        roles = '{}'::user_role[]
        or pr.role = any(roles)
      )
  );
end;
$$;

grant execute on function public.user_has_role(user_role[]) to authenticated;

-- Seleção liberada para vendedores, analistas e gestores.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_roles on public.profiles;
create policy profiles_select_roles
  on public.profiles for select
  using (
    public.user_has_role(array['vendedor','analista','gestor']::user_role[])
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert
  with check (auth.uid() = id);
