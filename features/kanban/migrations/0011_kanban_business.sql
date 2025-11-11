-- Kanban business rules: RPCs, triggers, and scheduled jobs
-- Covers: stage transitions, Comercial→Análise auto-move, cancel with reason,
-- finalize→historical after 5 minutes, soft delete + deletion log, and notifications basics.

-- Required extension for scheduling
create extension if not exists pg_cron;

-- Safety helper: check if current user can manage a card (creator, assignee, or gestor)
create or replace function public.can_user_manage_card(p_card_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  is_manager boolean := public.user_has_role(array['analista','gestor']::user_role[]);
  is_vendor boolean := public.user_has_role(array['vendedor']::user_role[]);
begin
  if is_manager then
    return exists (select 1 from public.kanban_cards kc where kc.id = p_card_id);
  elsif is_vendor then
    return exists (
      select 1
      from public.kanban_cards kc
      where kc.id = p_card_id
        and kc.created_by = auth.uid()
    );
  else
    return false;
  end if;
end;
$$;

grant execute on function public.can_user_manage_card(uuid) to authenticated;

-- Add columns to support lifecycle timestamps
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kanban_cards' and column_name = 'finalized_at'
  ) then
    alter table public.kanban_cards add column finalized_at timestamptz;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kanban_cards' and column_name = 'archived_at'
  ) then
    alter table public.kanban_cards add column archived_at timestamptz;
  end if;
end $$ language plpgsql;

-- Central RPC to change card stage with validations and business rules
create or replace function public.change_stage(
  p_card_id uuid,
  p_area public.kanban_area,
  p_stage text,
  p_reason text default null
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kanban_cards;
  v_old_area public.kanban_area;
  v_old_stage text;
begin
  -- Authorization: must be creator, assignee or gestor
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Você não tem permissão para mover este card.';
  end if;

  select * into v_row from public.kanban_cards where id = p_card_id for update;
  if not found then
    raise exception 'not_found' using message = 'Card não encontrado';
  end if;

  v_old_area := v_row.area;
  v_old_stage := v_row.stage;

  -- Block moves INTO 'entrada' (cannot move cards to the Entrada column)
  if lower(p_stage) = 'entrada' and v_row.stage is distinct from 'entrada' then
    raise exception 'invalid_stage' using message = 'A coluna "Entrada" não permite movimentações para dentro.';
  end if;

  -- Cancel flow: reason required; record audit fields
  if p_stage = 'canceladas' then
    if coalesce(nullif(trim(p_reason), ''), '') = '' then
      raise exception 'reason_required' using message = 'Motivo obrigatório para cancelar a ficha.';
    end if;
    update public.kanban_cards kc
      set area = 'analise', -- cancelamento acontece no contexto de análise
          stage = 'canceladas',
          cancel_reason = p_reason,
          cancelled_at = now(),
          cancelled_by = auth.uid(),
          updated_at = now()
      where kc.id = p_card_id
      returning * into v_row;

    -- Notify creator and assignee (if any)
    perform public.notify_card_move(v_row, v_old_area::text, v_old_stage, v_row.area::text, v_row.stage);
    return v_row;
  end if;

  -- Comercial → Concluídas: auto-redirect to Análise/Recebidos
  if p_area = 'comercial' and p_stage = 'concluidas' then
    update public.kanban_cards kc
      set area = 'analise',
          stage = 'recebidos',
          received_at = coalesce(kc.received_at, now()),
          assignee_id = null,
          updated_at = now()
      where kc.id = p_card_id
      returning * into v_row;
    perform public.notify_card_move(v_row, v_old_area::text, v_old_stage, v_row.area::text, v_row.stage);
    return v_row;
  end if;

  -- Ingresso em análise: ao mover para em_analise, assumir como assignee
  if p_area = 'analise' and p_stage = 'em_analise' and v_row.stage in ('recebidos', 'reanalise') then
    update public.kanban_cards kc
      set area = 'analise',
          stage = 'em_analise',
          assignee_id = auth.uid(),
          updated_at = now()
      where kc.id = p_card_id
      returning * into v_row;
    perform public.notify_card_move(v_row, v_old_area::text, v_old_stage, v_row.area::text, v_row.stage);
    return v_row;
  end if;

  -- Finalização: marca timestamp para posterior arquivamento/Histórico
  if p_area = 'analise' and p_stage = 'finalizados' then
    update public.kanban_cards kc
      set area = 'analise',
          stage = 'finalizados',
          finalized_at = coalesce(kc.finalized_at, now()),
          updated_at = now()
      where kc.id = p_card_id
      returning * into v_row;
    perform public.notify_card_move(v_row, v_old_area::text, v_old_stage, v_row.area::text, v_row.stage);
    return v_row;
  end if;

  -- Default: simple transition with validation of area
  update public.kanban_cards kc
    set area = p_area,
        stage = p_stage,
        updated_at = now()
    where kc.id = p_card_id
    returning * into v_row;
  perform public.notify_card_move(v_row, v_old_area::text, v_old_stage, v_row.area::text, v_row.stage);
  return v_row;
end;$$;

-- Soft delete RPC for kanban_cards with deletion log snapshot
create or replace function public.soft_delete_card(
  p_card_id uuid,
  p_reason text default null
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kanban_cards;
begin
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Você não tem permissão para excluir este card.';
  end if;

  select * into v_row from public.kanban_cards where id = p_card_id for update;
  if not found then
    raise exception 'not_found' using message = 'Card não encontrado';
  end if;

  update public.kanban_cards kc
    set deleted_at = now(),
        deleted_by = auth.uid(),
        deletion_reason = p_reason,
        updated_at = now()
    where kc.id = p_card_id
    returning * into v_row;

  insert into public.deletion_log(table_name, record_id, deleted_by, deleted_at, record_snapshot, reason)
  values ('kanban_cards', p_card_id, auth.uid(), now(), to_jsonb(v_row), coalesce(p_reason, ''));

  return v_row;
end;$$;

-- Minimal notification helper: inserts inbox entries for creator and assignee
create or replace function public.notify_card_move(
  p_row public.kanban_cards,
  p_from_area text,
  p_from_stage text,
  p_to_area text,
  p_to_stage text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Notify creator
  if p_row.created_by is not null then
    insert into public.inbox_notifications(user_id, type, priority, title, body, meta, card_id, applicant_id)
    values (
      p_row.created_by, 'card', 'low',
      'Card movido',
      format('Movido de %s/%s para %s/%s', coalesce(p_from_area,''), coalesce(p_from_stage,''), coalesce(p_to_area,''), coalesce(p_to_stage,'')),
      jsonb_build_object('from_area', p_from_area, 'from_stage', p_from_stage, 'to_area', p_to_area, 'to_stage', p_to_stage),
      p_row.id, p_row.applicant_id
    );
  end if;

  -- Notify assignee (if different from creator)
  if p_row.assignee_id is not null and p_row.assignee_id <> p_row.created_by then
    insert into public.inbox_notifications(user_id, type, priority, title, body, meta, card_id, applicant_id)
    values (
      p_row.assignee_id, 'card', 'low',
      'Card movido',
      format('Movido de %s/%s para %s/%s', coalesce(p_from_area,''), coalesce(p_from_stage,''), coalesce(p_to_area,''), coalesce(p_to_stage,'')),
      jsonb_build_object('from_area', p_from_area, 'from_stage', p_from_stage, 'to_area', p_to_area, 'to_stage', p_to_stage),
      p_row.id, p_row.applicant_id
    );
  end if;
end;$$;

-- Guard-rail trigger: if someone sets Comercial/Concluidas directly, normalize to Analise/Recebidos
create or replace function public.trg_kanban_normalize()
returns trigger language plpgsql as $$
begin
  -- Comercial concluídas → Análise/Recebidos
  if new.area = 'comercial' and new.stage = 'concluidas' then
    new.area := 'analise';
    new.stage := 'recebidos';
    if new.received_at is null then
      new.received_at := now();
    end if;
    new.assignee_id := null;
  end if;

  -- Finalizados: carimbo de hora
  if new.area = 'analise' and new.stage = 'finalizados' and (old.stage is distinct from new.stage) and new.finalized_at is null then
    new.finalized_at := now();
  end if;

  return new;
end;$$;

drop trigger if exists trg_kanban_normalize on public.kanban_cards;
create trigger trg_kanban_normalize
before update on public.kanban_cards
for each row execute function public.trg_kanban_normalize();

-- Scheduled archival: after 5 minutes in Finalizados, mark archived_at (front usa para Histórico)
-- Unschedule any existing job with the same name
select cron.unschedule(jobid)
from cron.job
where jobname = 'kanban_archive_finalizados';

select cron.schedule(
  'kanban_archive_finalizados',
  '*/1 * * * *',
  $$update public.kanban_cards
    set archived_at = now()
  where area = 'analise'
    and stage = 'finalizados'
    and archived_at is null
    and finalized_at is not null
    and now() - finalized_at > interval '5 minutes';$$
);
