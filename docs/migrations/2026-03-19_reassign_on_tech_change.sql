-- ============================================================
-- Migration: Reassign on technician state change (inactive/deleted)
-- Date: 2026-03-19
-- Description:
--   - FK free_row_id with ON DELETE SET NULL (if not present)
--   - Function reassign_for_technician (window 30 days, cap 100)
--   - Trigger on technicians: when active=false or deleted_at set, reassign
-- ============================================================

-- 1) FK on free_row_id (agenda_free_rows) with ON DELETE SET NULL
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='kanban_cards' and column_name='free_row_id'
  ) then
    -- drop old FK if exists and recreate with ON DELETE SET NULL
    declare
      v_conname text;
    begin
      select conname into v_conname
      from pg_constraint
      where conrelid = 'public.kanban_cards'::regclass
        and contype = 'f'
        and conname like 'fk_kanban_cards_free_row%';
      if v_conname is not null then
        execute format('alter table public.kanban_cards drop constraint %I', v_conname);
      end if;
      alter table public.kanban_cards
        add constraint fk_kanban_cards_free_row
        foreign key (free_row_id) references public.agenda_free_rows(id) on delete set null;
    end;
  end if;
end $$;

-- 2) Reassign for technician
create or replace function public.reassign_for_technician(
  p_technician_id uuid,
  p_date_from     date default current_date,
  p_date_to       date default current_date + 30,
  p_override_manual boolean default true,
  p_max           int  default 100
)
returns void language plpgsql as $$
declare
  rec record;
  v_sug_tech uuid;
  v_sug_slot text;
  v_slot_full text;
  v_day_start timestamptz;
  v_day_end   timestamptz;
  v_count     int := 0;
begin
  for rec in
    select c.id, c.technician_id, c.hora_at, c.due_at::date as d,
           c.stage, c.assign_origin, c.applicant_id, c.tipo_instalacao
    from public.kanban_cards c
    where c.deleted_at is null
      and c.due_at is not null
      and c.due_at::date between p_date_from and p_date_to
      and lower(coalesce(c.stage,'')) in ('recebidos','em_analise')
      and c.technician_id = p_technician_id
      and (p_override_manual or coalesce(c.assign_origin,'auto') <> 'manual')
  loop
    select s.technician_id, s.time_slot into v_sug_tech, v_sug_slot
    from public.suggest_assignment(rec.applicant_id, rec.d, rec.tipo_instalacao) s
    limit 1;
    if v_sug_tech is null or v_sug_slot is null then continue; end if;

    v_day_start := (rec.d::timestamp at time zone 'UTC');
    v_day_end   := v_day_start + interval '1 day';
    v_slot_full := v_sug_slot || ':00';

    if rec.technician_id is not distinct from v_sug_tech
       and array[v_slot_full] <@ coalesce(rec.hora_at, array[]::text[]) then
      continue;
    end if;

    if exists (
      select 1 from public.kanban_cards kc
      where kc.deleted_at is null
        and kc.technician_id = v_sug_tech
        and kc.due_at >= v_day_start and kc.due_at < v_day_end
        and kc.hora_at @> array[v_slot_full]
        and kc.id <> rec.id
    ) then continue; end if;

    if p_max is not null and v_count >= p_max then exit; end if;

    update public.kanban_cards
       set technician_id = v_sug_tech,
           hora_at       = array[v_slot_full],
           assign_origin = 'auto'
     where id = rec.id;

    insert into public.schedule_reassignments(card_id, old_tech, new_tech, old_slot, new_slot, reason)
    values (rec.id, rec.technician_id, v_sug_tech,
            (case when rec.hora_at is not null and array_length(rec.hora_at,1)>0 then rec.hora_at[1] else null end),
            v_slot_full,
            'technician_inactive_or_deleted');

    v_count := v_count + 1;
  end loop;
end $$;

-- 3) Trigger on technicians
create or replace function public.trg_reassign_on_technician_change()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE') then
    if (coalesce(OLD.active, true) = true and coalesce(NEW.active,false) = false) then
      perform public.reassign_for_technician(OLD.id, current_date, current_date + 30, true, 100);
    elsif (OLD.deleted_at is null and NEW.deleted_at is not null) then
      perform public.reassign_for_technician(OLD.id, current_date, current_date + 30, true, 100);
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_reassign_on_technician_change on public.technicians;
create trigger trg_reassign_on_technician_change
after update on public.technicians
for each row
execute function public.trg_reassign_on_technician_change();

