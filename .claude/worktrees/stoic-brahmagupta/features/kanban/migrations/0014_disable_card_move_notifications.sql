-- Disable card-move notifications entirely by overriding helper as no-op

do $$ begin
  create or replace function public.notify_card_move(
    p_row public.kanban_cards,
    p_from_area text,
    p_from_stage text,
    p_to_area text,
    p_to_stage text
  )
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $fn$
  begin
    -- Notifications for card moves are intentionally disabled
    return;
  end;
  $fn$;
exception when others then null; end $$;

