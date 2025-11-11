-- Notifications for replies in comments and pareceres

-- 1) Notify parent author on comment replies
do $$ begin
  create or replace function public.inbox_notify_comment_replies()
  returns trigger as $fn$
  declare
    v_parent record;
    v_area text;
    v_url text;
    v_author text;
  begin
    if new.parent_id is null or new.deleted_at is not null then
      return new;
    end if;

    select c.author_id, kc.area, coalesce(new.author_name,'Alguém') as author_name
      into v_parent
    from public.card_comments c
    join public.kanban_cards kc on kc.id = new.card_id
    where c.id = new.parent_id;

    if v_parent.author_id is not null and v_parent.author_id <> new.author_id then
      v_area := coalesce(v_parent.area, 'analise');
      v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;
      v_author := coalesce(new.author_name, 'Alguém');

      insert into public.inbox_notifications(
        user_id, type, priority, title, body,
        comment_id, card_id, applicant_id, transient, link_url, meta
      ) values (
        v_parent.author_id,
        'comment_reply',
        'low',
        '↩️ Nova resposta na conversa',
        left(coalesce(new.content,''), 600),
        new.id,
        new.card_id,
        new.applicant_id,
        false,
        v_url,
        jsonb_build_object('author_name', v_author)
      );
    end if;

    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

do $$ begin
  drop trigger if exists trg_inbox_comment_replies on public.card_comments;
  create trigger trg_inbox_comment_replies
  after insert on public.card_comments
  for each row execute function public.inbox_notify_comment_replies();
exception when others then null; end $$;

