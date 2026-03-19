-- Update soft_delete_card to also soft-delete Expanded Fichas (PF/PJ) for the applicant

do $$ begin
  create or replace function public.soft_delete_card(
    p_card_id uuid,
    p_reason text default null
  )
  returns public.kanban_cards
  language plpgsql
  security definer
  set search_path = public
  as $fn$
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

    -- Soft-delete Expanded Ficha PJ, if exists
    update public.pj_fichas pf
      set deleted_at = coalesce(pf.deleted_at, now()),
          deleted_by = coalesce(pf.deleted_by, auth.uid()),
          deletion_reason = coalesce(pf.deletion_reason, p_reason)
      where pf.applicant_id = v_row.applicant_id and pf.deleted_at is null;

    -- Soft-delete Expanded Ficha PF, if exists
    update public.pf_fichas pf
      set deleted_at = coalesce(pf.deleted_at, now()),
          deleted_by = coalesce(pf.deleted_by, auth.uid()),
          deletion_reason = coalesce(pf.deletion_reason, p_reason)
      where pf.applicant_id = v_row.applicant_id and pf.deleted_at is null;

    -- Log deletion (triggers also guard, but we keep explicit log for cards)
    insert into public.deletion_log(table_name, record_id, deleted_by, deleted_at, record_snapshot, reason)
    values ('kanban_cards', p_card_id, auth.uid(), now(), to_jsonb(v_row), coalesce(p_reason,''));

    return v_row;
  end;
  $fn$;
exception when others then null; end $$;
