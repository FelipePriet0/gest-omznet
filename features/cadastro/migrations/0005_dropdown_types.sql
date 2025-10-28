-- Normalize dropdown columns to proper types (enums/booleans/smallint)
-- Idempotent enum creation + robust USING mappings for legacy text values

begin;

-- Helpful for tolerant mappings (á/à/ã/â → a etc.)
create extension if not exists unaccent;

-- Enums (create if not exists)
do $$ begin
  create type pf_tipo_moradia as enum ('propria','alugada','cedida','outros');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pf_nas_outras as enum ('parentes','locador','so_conhecidos','nao_conhece');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pf_tipo_comprovante as enum ('energia','agua','internet','outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pf_vinculo as enum ('carteira_assinada','presta_servicos','contrato_trabalho','autonomo','concursado','outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pf_estado_civil as enum ('solteiro','casado','amasiado','separado','viuvo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_meio as enum ('ligacao','whatsapp','presencial','whats_uber');
exception when duplicate_object then null; end $$;

-- pf_fichas: text → boolean
alter table public.pf_fichas
  alter column unica_no_lote type boolean
  using (case
    when lower(unaccent(coalesce(unica_no_lote,''))) in ('sim','true','1') then true
    when lower(unaccent(coalesce(unica_no_lote,''))) in ('nao','não','false','0') then false
    else null
  end);

alter table public.pf_fichas
  alter column tem_contrato type boolean
  using (case
    when lower(unaccent(coalesce(tem_contrato,''))) in ('sim','true','1') then true
    when lower(unaccent(coalesce(tem_contrato,''))) in ('nao','não','false','0') then false
    else null
  end);

alter table public.pf_fichas
  alter column enviou_contrato type boolean
  using (case
    when lower(unaccent(coalesce(enviou_contrato,''))) in ('sim','true','1') then true
    when lower(unaccent(coalesce(enviou_contrato,''))) in ('nao','não','false','0') then false
    else null
  end);

alter table public.pf_fichas
  alter column enviou_comprovante type boolean
  using (case
    when lower(unaccent(coalesce(enviou_comprovante,''))) in ('sim','true','1') then true
    when lower(unaccent(coalesce(enviou_comprovante,''))) in ('nao','não','false','0') then false
    else null
  end);

alter table public.pf_fichas
  alter column tem_internet_fixa type boolean
  using (case
    when lower(unaccent(coalesce(tem_internet_fixa,''))) in ('sim','true','1') then true
    when lower(unaccent(coalesce(tem_internet_fixa,''))) in ('nao','não','false','0') then false
    else null
  end);

-- pf_fichas: text → enums
alter table public.pf_fichas
  alter column tipo_moradia type pf_tipo_moradia
  using (case
    when lower(unaccent(coalesce(tipo_moradia,''))) = 'propria' then 'propria'::pf_tipo_moradia
    when lower(unaccent(coalesce(tipo_moradia,''))) = 'alugada' then 'alugada'::pf_tipo_moradia
    when lower(unaccent(coalesce(tipo_moradia,''))) = 'cedida'  then 'cedida'::pf_tipo_moradia
    when lower(unaccent(coalesce(tipo_moradia,''))) = 'outros'  then 'outros'::pf_tipo_moradia
    else null
  end);

alter table public.pf_fichas
  alter column nas_outras type pf_nas_outras
  using (case
    when lower(unaccent(coalesce(nas_outras,''))) = 'parentes' then 'parentes'::pf_nas_outras
    when lower(unaccent(coalesce(nas_outras,''))) like 'locador%' then 'locador'::pf_nas_outras
    when lower(unaccent(coalesce(nas_outras,''))) like '%conhecid%' then 'so_conhecidos'::pf_nas_outras
    when lower(unaccent(coalesce(nas_outras,''))) like '%nao conhece%' then 'nao_conhece'::pf_nas_outras
    else null
  end);

alter table public.pf_fichas
  alter column tipo_comprovante type pf_tipo_comprovante
  using (case
    when lower(unaccent(coalesce(tipo_comprovante,''))) = 'energia'  then 'energia'::pf_tipo_comprovante
    when lower(unaccent(coalesce(tipo_comprovante,''))) = 'agua'     then 'agua'::pf_tipo_comprovante
    when lower(unaccent(coalesce(tipo_comprovante,''))) = 'internet' then 'internet'::pf_tipo_comprovante
    when lower(unaccent(coalesce(tipo_comprovante,''))) = 'outro'    then 'outro'::pf_tipo_comprovante
    else null
  end);

alter table public.pf_fichas
  alter column vinculo type pf_vinculo
  using (case
    when lower(unaccent(coalesce(vinculo,''))) like 'carteira assinada%' then 'carteira_assinada'::pf_vinculo
    when lower(unaccent(coalesce(vinculo,''))) like 'presta servico%' or lower(unaccent(coalesce(vinculo,''))) like 'presta serviços%' then 'presta_servicos'::pf_vinculo
    when lower(unaccent(coalesce(vinculo,''))) like 'contrato trabalho%' then 'contrato_trabalho'::pf_vinculo
    when lower(unaccent(coalesce(vinculo,''))) like 'autonom%' then 'autonomo'::pf_vinculo
    when lower(unaccent(coalesce(vinculo,''))) like 'concursad%' then 'concursado'::pf_vinculo
    when lower(unaccent(coalesce(vinculo,''))) = 'outro' then 'outro'::pf_vinculo
    else null
  end);

alter table public.pf_fichas
  alter column estado_civil type pf_estado_civil
  using (case
    when lower(unaccent(coalesce(estado_civil,''))) like 'solteir%' then 'solteiro'::pf_estado_civil
    when lower(unaccent(coalesce(estado_civil,''))) like 'casad%'   then 'casado'::pf_estado_civil
    when lower(unaccent(coalesce(estado_civil,''))) like 'amas%'    then 'amasiado'::pf_estado_civil
    when lower(unaccent(coalesce(estado_civil,''))) like 'separad%' then 'separado'::pf_estado_civil
    when lower(unaccent(coalesce(estado_civil,''))) like 'viuv%'    then 'viuvo'::pf_estado_civil
    else null
  end);

-- applicants: venc (smallint + check)
alter table public.applicants
  alter column venc type smallint
  using (nullif(regexp_replace(coalesce(venc,''), '[^0-9]', '', 'g'), '')::smallint);

alter table public.applicants
  drop constraint if exists applicants_venc_chk;

alter table public.applicants
  add constraint applicants_venc_chk check (venc in (5,10,15,20,25));

-- applicants: meio (enum)
alter table public.applicants
  alter column meio type app_meio
  using (case
    when lower(unaccent(coalesce(meio,''))) like 'ligac%'     then 'ligacao'::app_meio
    when lower(unaccent(coalesce(meio,''))) like 'whats%uber' then 'whats_uber'::app_meio
    when lower(unaccent(coalesce(meio,''))) like 'whats%'     then 'whatsapp'::app_meio
    when lower(unaccent(coalesce(meio,''))) like 'presen%'    then 'presencial'::app_meio
    else null
  end);

commit;

