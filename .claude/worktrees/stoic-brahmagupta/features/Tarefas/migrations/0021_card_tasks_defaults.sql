-- Defaults and automatic fields for card_tasks on insert

do $$ begin
  create or replace function public.trg_card_tasks_defaults()
  returns trigger as $fn$
  declare v_app uuid;
  begin
    if new.created_by is null then new.created_by := auth.uid(); end if;
    if new.status is null then new.status := 'pending'; end if;
    if new.card_id is not null then
      select applicant_id into v_app from public.kanban_cards where id = new.card_id;
      if v_app is not null then new.applicant_id := coalesce(new.applicant_id, v_app); end if;
    end if;
    if new.created_at is null then new.created_at := now(); end if;
    if new.updated_at is null then new.updated_at := now(); end if;
    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

do $$ begin
  drop trigger if exists trg_card_tasks_defaults on public.card_tasks;
  create trigger trg_card_tasks_defaults
  before insert on public.card_tasks
  for each row execute function public.trg_card_tasks_defaults();
exception when others then null; end $$;

