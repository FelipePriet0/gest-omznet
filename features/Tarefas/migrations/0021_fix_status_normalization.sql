-- Normalize status values in v_my_tasks and keep filters stable
do $$ begin
  create or replace view public.v_my_tasks as
  select
    t.id,
    t.description,
    -- Normalize status to 'pending' | 'completed'
    case
      when lower(coalesce(t.status,'')) in ('completed','concluida','concluído','concluido','done') then 'completed'
      when lower(coalesce(t.status,'')) in ('pending','pendente','open') then 'pending'
      else lower(coalesce(t.status,''))
    end as status,
    t.deadline,
    t.created_at,
    t.updated_at,
    t.completed_at,
    t.card_id,
    kc.area,
    kc.stage,
    kc.applicant_id,
    a.primary_name as applicant_name,
    a.cpf_cnpj,
    t.assigned_to,
    ass.full_name as assigned_name,
    t.created_by,
    crt.full_name as created_name,
    t.comment_id
  from public.card_tasks t
  join public.kanban_cards kc on kc.id = t.card_id
  join public.applicants a on a.id = kc.applicant_id
  left join public.profiles ass on ass.id = t.assigned_to
  left join public.profiles crt on crt.id = t.created_by;
exception when others then null; end $$;

-- Recreate list_my_tasks to rely on normalized status
do $$ begin
  create or replace function public.list_my_tasks(
    p_status text default null,
    p_due text default null,
    p_date_start timestamptz default null,
    p_date_end timestamptz default null,
    p_search text default null
  )
  returns setof public.v_my_tasks
  language sql
  security definer
  set search_path = public
  as $fn$
    with base as (
      select * from public.v_my_tasks m
      where m.assigned_to = auth.uid()
    )
    select * from base b
    where (
        p_status is null
        or lower(p_status) = 'all'
        or b.status = lower(p_status)
      )
      and (
        p_due is null or
        (p_due = 'hoje' and b.deadline::date = now()::date) or
        (p_due = 'amanha' and b.deadline::date = (now() + interval '1 day')::date) or
        (p_due = 'atrasado' and b.deadline is not null and b.deadline < now()) or
        (p_due = 'intervalo' and p_date_start is not null and p_date_end is not null and b.deadline between p_date_start and p_date_end)
      )
      and (
        p_search is null or
        unaccent(b.applicant_name) ilike unaccent('%'||p_search||'%') or
        unaccent(b.description) ilike unaccent('%'||p_search||'%')
      )
    order by
      (b.status = 'pending') desc,
      b.deadline nulls last,
      b.created_at desc
  $fn$;
exception when others then null; end $$;

