-- Garante unicidade de nomes de técnicos (case-insensitive), ignorando soft-deletes
-- Roda uma checagem prévia para evitar falha por duplicatas já existentes

begin;

do $$
declare
  dup_count integer;
begin
  select count(*) into dup_count
  from (
    select lower(name) as lname, count(*) as c
    from public.technicians
    where deleted_at is null
    group by lower(name)
    having count(*) > 1
  ) t;

  if dup_count > 0 then
    raise exception 'Não foi possível criar a restrição de unicidade em technicians.name: existem % nomes duplicados (case-insensitive). Corrija-os (ou renomeie) e rode a migration novamente.', dup_count;
  end if;
end$$;

-- Índice único parcial (ignora registros soft-deletados)
create unique index if not exists technicians_name_unique_ci
  on public.technicians (lower(name))
  where deleted_at is null;

commit;

