-- ============================================================
-- Migration: Reassign on card/applicant change (auto-origin only)
-- Date: 2026-03-19
-- Description:
--   - Reassign a single card when its key fields change (due_at, tipo_instalacao)
--     and assign_origin='auto'
--   - Reassign all future cards for an applicant when bairro changes
-- ============================================================

-- 1) Reassign a single card if eligible (auto only)
create or replace function public.reassign_for_card(p_card_id uuid)
returns void language plpgsql as $$
declare
  rec record;
  v_sug_tech uuid;
  v_sug_slot text;
  v_slot_full text;
  v_day_start timestamptz;
  v_day_end   timestamptz;
begin
  select c.id, c.technician_id, c.hora_at, c.due_at::date as d,
         c.stage, c.assign_origin, c.applicant_id, c.tipo_instalacao
    into rec
  from public.kanban_cards c
  where c.id = p_card_id and c.deleted_at is null;

  if rec.id is null then return; end if;
  if coalesce(rec.assign_origin,'auto') = 'manual' then return; end if;
  if rec.d is null or rec.d < current_date then return; end if;
  if lower(coalesce(rec.stage,'')) not in ('recebidos','em_analise') then return; end if;

  select s.technician_id, s.time_slot into v_sug_tech, v_sug_slot
  from public.suggest_assignment(rec.applicant_id, rec.d, rec.tipo_instalacao) s
  limit 1;
  if v_sug_tech is null or v_sug_slot is null then return; end if;

  v_day_start := (rec.d::timestamp at time zone 'UTC');
  v_day_end   := v_day_start + interval '1 day';
  v_slot_full := v_sug_slot || ':00';

  if rec.technician_id is not distinct from v_sug_tech
     and array[v_slot_full] <@ coalesce(rec.hora_at, array[]::text[]) then
    return;
  end if;

  if exists (
    select 1 from public.kanban_cards kc
    where kc.deleted_at is null
      and kc.technician_id = v_sug_tech
      and kc.due_at >= v_day_start and kc.due_at < v_day_end
      and kc.hora_at @> array[v_slot_full]
      and kc.id <> rec.id
  ) then return; end if;

  update public.kanban_cards
     set technician_id = v_sug_tech,
         hora_at       = array[v_slot_full],
         assign_origin = 'auto'
   where id = rec.id;

  insert into public.schedule_reassignments(card_id, old_tech, new_tech, old_slot, new_slot, reason)
  values (rec.id, rec.technician_id, v_sug_tech,
          (case when rec.hora_at is not null and array_length(rec.hora_at,1)>0 then rec.hora_at[1] else null end),
          v_slot_full,
          'card_field_changed');
end $$;

-- 2) Trigger on kanban_cards: when due_at or tipo_instalacao changes, reassign (auto only)
create or replace function public.trg_reassign_on_card_update()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE') then
    if (coalesce(OLD.assign_origin,'auto') <> 'manual') then
      if (OLD.due_at is distinct from NEW.due_at) or (OLD.tipo_instalacao is distinct from NEW.tipo_instalacao) then
        perform public.reassign_for_card(OLD.id);
      end if;
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_reassign_on_card_update on public.kanban_cards;
create trigger trg_reassign_on_card_update
after update on public.kanban_cards
for each row
execute function public.trg_reassign_on_card_update();

-- 3) Reassign for applicant (bairro changed) for future cards (auto only), cap 100
create or replace function public.reassign_for_applicant(
  p_applicant_id uuid,
  p_date_from    date default current_date,
  p_date_to      date default current_date + 30,
  p_max          int  default 100
)
returns void language plpgsql as $$
declare
  rec record;
  v_count int := 0;
begin
  for rec in
    select c.id
    from public.kanban_cards c
    where c.deleted_at is null
      and c.applicant_id = p_applicant_id
      and c.due_at is not null
      and c.due_at::date between p_date_from and p_date_to
      and lower(coalesce(c.stage,'')) in ('recebidos','em_analise')
      and coalesce(c.assign_origin,'auto') <> 'manual'
  loop
    if p_max is not null and v_count >= p_max then exit; end if;
    perform public.reassign_for_card(rec.id);
    v_count := v_count + 1;
  end loop;
end $$;

-- 4) Trigger on applicants: when bairro changes, reassign applicant's future cards (auto only)
create or replace function public.trg_reassign_on_applicant_update()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE') then
    if (public.norm_text(OLD.bairro) is distinct from public.norm_text(NEW.bairro)) then
      perform public.reassign_for_applicant(OLD.id, current_date, current_date + 30, 100);
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_reassign_on_applicant_update on public.applicants;
create trigger trg_reassign_on_applicant_update
after update on public.applicants
for each row
execute function public.trg_reassign_on_applicant_update();

