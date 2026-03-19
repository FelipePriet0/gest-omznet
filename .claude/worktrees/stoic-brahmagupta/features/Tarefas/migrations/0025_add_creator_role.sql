-- Add creator role to v_my_tasks view
do $$ begin
  create or replace view public.v_my_tasks as
  select
    t.id,
    t.description,
    t.status,
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
    crt.role as creator_role,
    t.comment_id
  from public.card_tasks t
  join public.kanban_cards kc on kc.id = t.card_id
  join public.applicants a on a.id = kc.applicant_id
  left join public.profiles ass on ass.id = t.assigned_to
  left join public.profiles crt on crt.id = t.created_by;
exception when others then null; end $$;

