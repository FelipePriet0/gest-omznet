-- Normalize PJ dropdown columns to proper types

begin;

create extension if not exists unaccent;

do $$ begin
  create type pj_tipo_imovel as enum ('comercio_terreo','comercio_sala','casa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pj_tipo_estabelecimento as enum ('propria','alugada','cedida','outros');
exception when duplicate_object then null; end $$;

-- We could reuse pf_tipo_comprovante; keep a PJ-specific for decoupling
do $$ begin
  create type pj_tipo_comprovante as enum ('energia','agua','internet','outro');
exception when duplicate_object then null; end $$;

-- booleans: enviou_comprovante, possui_internet, contrato_social
alter table public.pj_fichas
  alter column enviou_comprovante type boolean
  using (case
    when lower(unaccent(coalesce(enviou_comprovante::text,''))) in ('sim','true','1') then true
    when lower(unaccent(coalesce(enviou_comprovante::text,''))) in ('nao','não','false','0') then false
    else null
  end);

alter table public.pj_fichas
  alter column possui_internet type boolean
  using (case
    when lower(unaccent(coalesce(possui_internet::text,''))) in ('sim','true','1') then true
    when lower(unaccent(coalesce(possui_internet::text,''))) in ('nao','não','false','0') then false
    else null
  end);

alter table public.pj_fichas
  alter column contrato_social type boolean
  using (case
    when lower(unaccent(coalesce(contrato_social::text,''))) in ('sim','true','1') then true
    when lower(unaccent(coalesce(contrato_social::text,''))) in ('nao','não','false','0') then false
    else null
  end);

-- enums: tipo_imovel, tipo_estabelecimento, tipo_comprovante
alter table public.pj_fichas
  alter column tipo_imovel type pj_tipo_imovel
  using (case
    when lower(unaccent(coalesce(tipo_imovel,''))) like 'comercio t%' then 'comercio_terreo'::pj_tipo_imovel
    when lower(unaccent(coalesce(tipo_imovel,''))) like 'comercio s%' then 'comercio_sala'::pj_tipo_imovel
    when lower(unaccent(coalesce(tipo_imovel,''))) = 'casa' then 'casa'::pj_tipo_imovel
    else null
  end);

alter table public.pj_fichas
  alter column tipo_estabelecimento type pj_tipo_estabelecimento
  using (case
    when lower(unaccent(coalesce(tipo_estabelecimento,''))) = 'propria' then 'propria'::pj_tipo_estabelecimento
    when lower(unaccent(coalesce(tipo_estabelecimento,''))) = 'alugada' then 'alugada'::pj_tipo_estabelecimento
    when lower(unaccent(coalesce(tipo_estabelecimento,''))) = 'cedida'  then 'cedida'::pj_tipo_estabelecimento
    when lower(unaccent(coalesce(tipo_estabelecimento,''))) = 'outros'  then 'outros'::pj_tipo_estabelecimento
    else null
  end);

alter table public.pj_fichas
  alter column tipo_comprovante type pj_tipo_comprovante
  using (case
    when lower(unaccent(coalesce(tipo_comprovante,''))) = 'energia'  then 'energia'::pj_tipo_comprovante
    when lower(unaccent(coalesce(tipo_comprovante,''))) = 'agua'     then 'agua'::pj_tipo_comprovante
    when lower(unaccent(coalesce(tipo_comprovante,''))) = 'internet' then 'internet'::pj_tipo_comprovante
    when lower(unaccent(coalesce(tipo_comprovante,''))) = 'outro'    then 'outro'::pj_tipo_comprovante
    else null
  end);

commit;

