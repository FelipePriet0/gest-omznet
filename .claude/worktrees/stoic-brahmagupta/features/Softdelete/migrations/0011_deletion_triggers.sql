-- Generic logger for soft- and hard-deletes into deletion_log

do $$ begin
  create or replace function public.log_deletion_generic()
  returns trigger as $fn$
  declare
    v_tbl text := tg_table_name;
    v_row jsonb;
    v_id uuid;
    v_deleted_by uuid;
    v_reason text;
  begin
    if (tg_op = 'UPDATE') then
      -- Only when marking deleted_at
      v_row := to_jsonb(new);
      v_id := coalesce((v_row->>'id')::uuid, null);
      v_deleted_by := coalesce((v_row->>'deleted_by')::uuid, auth.uid());
      v_reason := (v_row->>'deletion_reason');
      if new.deleted_at is not null and (old.deleted_at is null or new.deleted_at is distinct from old.deleted_at) then
        -- avoid duplicate if already logged very recently (e.g., via RPC)
        if not exists (
          select 1 from public.deletion_log d
          where d.table_name = v_tbl and d.record_id = v_id
            and d.deleted_at > now() - interval '2 seconds'
        ) then
          insert into public.deletion_log(table_name, record_id, deleted_by, deleted_at, record_snapshot, reason)
          values (v_tbl, v_id, v_deleted_by, coalesce(new.deleted_at, now()), v_row, v_reason);
        end if;
      end if;
      return new;
    elsif (tg_op = 'DELETE') then
      v_row := to_jsonb(old);
      v_id := coalesce((v_row->>'id')::uuid, null);
      v_deleted_by := auth.uid();
      insert into public.deletion_log(table_name, record_id, deleted_by, deleted_at, record_snapshot, reason)
      values (v_tbl, v_id, v_deleted_by, now(), v_row, null);
      return old;
    end if;
    return null;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- Attach triggers to target tables
do $$ begin
  -- kanban_cards
  drop trigger if exists trg_log_del_kanban_cards_upd on public.kanban_cards;
  create trigger trg_log_del_kanban_cards_upd
  after update of deleted_at on public.kanban_cards
  for each row execute function public.log_deletion_generic();

  drop trigger if exists trg_log_del_kanban_cards_del on public.kanban_cards;
  create trigger trg_log_del_kanban_cards_del
  after delete on public.kanban_cards
  for each row execute function public.log_deletion_generic();

  -- pj_fichas
  drop trigger if exists trg_log_del_pj_fichas_upd on public.pj_fichas;
  create trigger trg_log_del_pj_fichas_upd
  after update of deleted_at on public.pj_fichas
  for each row execute function public.log_deletion_generic();

  drop trigger if exists trg_log_del_pj_fichas_del on public.pj_fichas;
  create trigger trg_log_del_pj_fichas_del
  after delete on public.pj_fichas
  for each row execute function public.log_deletion_generic();

  -- pf_fichas
  drop trigger if exists trg_log_del_pf_fichas_upd on public.pf_fichas;
  create trigger trg_log_del_pf_fichas_upd
  after update of deleted_at on public.pf_fichas
  for each row execute function public.log_deletion_generic();

  drop trigger if exists trg_log_del_pf_fichas_del on public.pf_fichas;
  create trigger trg_log_del_pf_fichas_del
  after delete on public.pf_fichas
  for each row execute function public.log_deletion_generic();

  -- card_comments
  drop trigger if exists trg_log_del_card_comments_upd on public.card_comments;
  create trigger trg_log_del_card_comments_upd
  after update of deleted_at on public.card_comments
  for each row execute function public.log_deletion_generic();

  drop trigger if exists trg_log_del_card_comments_del on public.card_comments;
  create trigger trg_log_del_card_comments_del
  after delete on public.card_comments
  for each row execute function public.log_deletion_generic();

  -- card_attachments
  drop trigger if exists trg_log_del_card_attachments_upd on public.card_attachments;
  create trigger trg_log_del_card_attachments_upd
  after update of deleted_at on public.card_attachments
  for each row execute function public.log_deletion_generic();

  drop trigger if exists trg_log_del_card_attachments_del on public.card_attachments;
  create trigger trg_log_del_card_attachments_del
  after delete on public.card_attachments
  for each row execute function public.log_deletion_generic();

  -- card_tasks
  drop trigger if exists trg_log_del_card_tasks_upd on public.card_tasks;
  create trigger trg_log_del_card_tasks_upd
  after update of deleted_at on public.card_tasks
  for each row execute function public.log_deletion_generic();

  drop trigger if exists trg_log_del_card_tasks_del on public.card_tasks;
  create trigger trg_log_del_card_tasks_del
  after delete on public.card_tasks
  for each row execute function public.log_deletion_generic();
exception when others then null; end $$;

