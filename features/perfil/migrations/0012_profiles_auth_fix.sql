-- Harden auth→profiles onboarding to avoid signup failures

-- Helper to normalize role safely
create or replace function public.normalize_user_role(p_txt text)
returns public.user_role
language plpgsql
as $$
declare
  v_txt text := lower(coalesce(p_txt, ''));
  v_role public.user_role := 'vendedor';
begin
  if v_txt in ('vendedor','analista','gestor') then
    v_role := v_txt::public.user_role;
  else
    v_role := 'vendedor';
  end if;
  return v_role;
end;$$;

-- Create profile on new auth user using raw_user_meta_data (robust)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  md jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full_name text := md->>'full_name';
  v_role_txt text := md->>'role';
begin
  begin
    insert into public.profiles (id, full_name, role)
    values (new.id, v_full_name, public.normalize_user_role(v_role_txt))
    on conflict (id) do nothing;
  exception when others then
    -- Do not break user creation if profile insert fails
    perform 1;
  end;
  return new;
end;$$;

-- Keep email/full_name/role in sync if auth.users changes (robust)
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  md jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full_name text := md->>'full_name';
  v_role_txt text := md->>'role';
begin
  begin
    update public.profiles p
      set full_name = coalesce(v_full_name, p.full_name),
          role = coalesce(public.normalize_user_role(v_role_txt), p.role),
          updated_at = now()
    where p.id = new.id;
  exception when others then
    -- Swallow errors to avoid breaking auth update
    perform 1;
  end;
  return new;
end;$$;

