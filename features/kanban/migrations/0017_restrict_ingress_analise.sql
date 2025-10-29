-- Restrict ingress (Recebidos → Em Análise) to roles Analista/Gestor only

do $$ begin
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
  as $fn$
  declare
    v_row public.kanban_cards;
    v_old_area public.kanban_area;
    v_old_stage text;
    v_is_analista_gestor boolean;
  begin
    if not public.can_user_manage_card(p_card_id) then
      raise exception 'not_allowed' using message = 'Você não tem permissão para mover este card.';
    end if;

    select * into v_row from public.kanban_cards where id = p_card_id for update;
    if not found then
      raise exception 'not_found' using message = 'Card não encontrado';
    end if;

    v_old_area := v_row.area;
    v_old_stage := v_row.stage;

    if lower(p_stage) = 'entrada' and v_row.stage is distinct from 'entrada' then
      raise exception 'invalid_stage' using message = 'A coluna "Entrada" não permite movimentações para dentro.';
    end if;

    if p_stage = 'canceladas' then
      if coalesce(nullif(trim(p_reason), ''), '') = '' then
        raise exception 'reason_required' using message = 'Motivo obrigatório para cancelar a ficha.';
      end if;
      update public.kanban_cards kc
        set area = 'analise',
            stage = 'canceladas',
            cancel_reason = p_reason,
            cancelled_at = now(),
            cancelled_by = auth.uid(),
            updated_at = now()
        where kc.id = p_card_id
        returning * into v_row;
      perform public.notify_card_move(v_row, v_old_area::text, v_old_stage, v_row.area::text, v_row.stage);
      return v_row;
    end if;

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

    -- Only Analista/Gestor can ingress: Recebidos/Reanálise -> Em Análise
    if p_area = 'analise' and p_stage = 'em_analise' and v_row.stage in ('recebidos', 'reanalise') then
      select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('analista','gestor')) into v_is_analista_gestor;
      if not coalesce(v_is_analista_gestor, false) then
        raise exception 'not_allowed' using message = 'Apenas Analistas ou Gestores podem ingressar a ficha.';
      end if;
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

    if p_area = 'analise' and p_stage = 'finalizados' then
      update public.kanban_cards kc
        set area = 'analise',
            stage = 'finalizados',
            final_decision = v_old_stage,
            finalized_by = auth.uid(),
            updated_at = now()
        where kc.id = p_card_id
        returning * into v_row;
      perform public.notify_card_move(v_row, v_old_area::text, v_old_stage, v_row.area::text, v_row.stage);
      return v_row;
    end if;

    update public.kanban_cards kc
      set area = p_area,
          stage = p_stage,
          updated_at = now()
      where kc.id = p_card_id
      returning * into v_row;
    perform public.notify_card_move(v_row, v_old_area::text, v_old_stage, v_row.area::text, v_row.stage);
    return v_row;
  end;
  $fn$;
exception when others then null; end $$;

