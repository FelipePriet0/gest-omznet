-- Listar responsáveis para filtros do Kanban
-- Retorna apenas id e nome, por área
-- Usa security definer para contornar RLS de profiles com escopo mínimo

create or replace function public.list_responsaveis(p_area public.kanban_area)
returns table(id uuid, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_area = 'comercial' then
    return query
      select p.id, coalesce(p.full_name, '') as full_name
      from public.profiles p
      where p.role = 'vendedor'
      order by coalesce(p.full_name, '') asc;
  else
    -- análise: analistas e gestores
    return query
      select p.id, coalesce(p.full_name, '') as full_name
      from public.profiles p
      where p.role in ('analista','gestor')
      order by coalesce(p.full_name, '') asc;
  end if;
end;$$;

