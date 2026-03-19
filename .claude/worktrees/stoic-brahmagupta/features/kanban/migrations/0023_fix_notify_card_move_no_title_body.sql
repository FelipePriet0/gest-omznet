-- Normalize notify_card_move to new inbox schema (no title/body).
-- Uses `content` snapshot and `link_url`, `meta` JSON instead.

begin;

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
as $$
declare
  v_msg text;
  v_url text;
begin
  v_msg := format(
    'Movido de %s/%s para %s/%s',
    coalesce(p_from_area, ''), coalesce(p_from_stage, ''),
    coalesce(p_to_area, ''), coalesce(p_to_stage, '')
  );
  v_url := case when coalesce(p_to_area, p_row.area::text) = 'analise'
            then '/kanban/analise?card=' || p_row.id::text
            else '/kanban?card=' || p_row.id::text
          end;

  if p_row.created_by is not null then
    insert into public.inbox_notifications(
      user_id, type, priority,
      card_id, applicant_id, link_url, meta, content
    ) values (
      p_row.created_by,
      'card',
      'low',
      p_row.id,
      p_row.applicant_id,
      v_url,
      jsonb_build_object(
        'from_area', p_from_area,
        'from_stage', p_from_stage,
        'to_area', p_to_area,
        'to_stage', p_to_stage
      ),
      v_msg
    );
  end if;

  if p_row.assignee_id is not null and p_row.assignee_id <> p_row.created_by then
    insert into public.inbox_notifications(
      user_id, type, priority,
      card_id, applicant_id, link_url, meta, content
    ) values (
      p_row.assignee_id,
      'card',
      'low',
      p_row.id,
      p_row.applicant_id,
      v_url,
      jsonb_build_object(
        'from_area', p_from_area,
        'from_stage', p_from_stage,
        'to_area', p_to_area,
        'to_stage', p_to_stage
      ),
      v_msg
    );
  end if;
end;$$;

commit;

