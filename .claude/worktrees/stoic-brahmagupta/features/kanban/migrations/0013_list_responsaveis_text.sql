-- Recreate list_responsaveis using TEXT arg to avoid enum mismatch via PostgREST

-- Cleanup old signature if it exists
do $$ begin
  perform 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'list_responsaveis' and p.proargtypes::text like '% kanban_area%';
  if found then
    execute 'drop function if exists public.list_responsaveis(public.kanban_area)';
  end if;
end $$;

create or replace function public.list_responsaveis(p_area text)
returns table(id uuid, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(p_area,'')) = 'comercial' then
    return query
      select p.id, coalesce(p.full_name, '') as full_name
      from public.profiles p
      where p.role = 'vendedor'
      order by 2;
  else
    return query
      select p.id, coalesce(p.full_name, '') as full_name
      from public.profiles p
      where p.role in ('analista','gestor')
      order by 2;
  end if;
end;$$;

grant execute on function public.list_responsaveis(text) to anon, authenticated;

-- Ask PostgREST to reload its schema cache
select pg_notify('pgrst','reload schema');

