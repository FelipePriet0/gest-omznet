-- Ensure pf_fichas has soft-delete columns to align with pj_fichas
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pf_fichas' and column_name='deleted_at'
  ) then
    alter table public.pf_fichas add column deleted_at timestamptz;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pf_fichas' and column_name='deleted_by'
  ) then
    alter table public.pf_fichas add column deleted_by uuid references public.profiles(id);
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pf_fichas' and column_name='deletion_reason'
  ) then
    alter table public.pf_fichas add column deletion_reason text;
  end if;
exception when others then null; end $$;

