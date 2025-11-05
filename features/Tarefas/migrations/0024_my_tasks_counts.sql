-- Simple counts for Minhas Tarefas (backend-first)
do $$ begin
  create or replace function public.my_tasks_counts()
  returns table(pending bigint, completed bigint)
  language sql
  security definer
  set search_path = public
  as $fn$
    select
      count(*) filter (where t.assigned_to = auth.uid() and lower(coalesce(t.status,'')) in ('pending','pendente','open')) as pending,
      count(*) filter (where t.assigned_to = auth.uid() and lower(coalesce(t.status,'')) in ('completed','concluida','concluído','concluido','done')) as completed
    from public.card_tasks t
  $fn$;
exception when others then null; end $$;

