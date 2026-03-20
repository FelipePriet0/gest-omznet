-- Corrige nomes de técnicos duplicados automaticamente e cria índice único
-- Regra: mantém o primeiro (ordem por id) e renomeia os demais como "Nome 1", "Nome 2", ... garantindo unicidade

begin;

-- Renomear duplicados (case-insensitive) adicionando sufixos numéricos até encontrar um disponível
do $$
declare
  rec record;
  candidate text;
  exists_name boolean;
  suffix int;
begin
  for rec in
    select id, name,
           row_number() over (partition by lower(name) order by id asc) as rn
    from public.technicians
    where deleted_at is null
  loop
    -- mantém o primeiro de cada grupo
    if rec.rn = 1 then
      continue;
    end if;

    suffix := 1;
    loop
      candidate := rec.name || ' ' || suffix::text;
      select exists(
        select 1 from public.technicians
        where deleted_at is null and lower(name) = lower(candidate)
      ) into exists_name;
      if not exists_name then
        update public.technicians set name = candidate where id = rec.id;
        exit;
      end if;
      suffix := suffix + 1;
    end loop;
  end loop;
end $$;

-- Criar índice único parcial (ignora registros soft-deletados)
create unique index if not exists technicians_name_unique_ci
  on public.technicians (lower(name))
  where deleted_at is null;

commit;

