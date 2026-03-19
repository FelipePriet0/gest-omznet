-- Remove task notifications from inbox system

-- 1) Drop task-related triggers and functions
do $$ begin
  drop trigger if exists trg_inbox_task_events on public.card_tasks;
  drop function if exists public.inbox_notify_task_events();
exception when others then null; end $$;

-- 2) Drop task due scanning function
do $$ begin
  drop function if exists public.inbox_scan_task_due(int);
exception when others then null; end $$;

-- 3) Update run_inbox_maintenance to remove task scanning
do $$ begin
  create or replace function public.run_inbox_maintenance()
  returns table(card_notifs int) as $fn$
  begin
    card_notifs := public.inbox_scan_cards_overdue(4);
    return next;
  end;
  $fn$ language plpgsql security definer set search_path = public;
exception when others then null; end $$;

-- 4) Ensure comment mention notifications carry applicant context
do $$ begin
  create or replace function public.inbox_notify_comment_mentions()
  returns trigger as $fn$
  declare
    r_prof record;
    v_author text;
    v_area text;
    v_url text;
    v_applicant_id uuid;
    v_applicant_name text;
  begin
    if new.content is null or new.deleted_at is not null then
      return new;
    end if;

    v_author := coalesce(new.author_name, 'Alguém');

    select kc.area, kc.applicant_id, a.primary_name
      into v_area, v_applicant_id, v_applicant_name
    from public.kanban_cards kc
    left join public.applicants a on a.id = kc.applicant_id
    where kc.id = new.card_id;

    v_area := coalesce(v_area, 'analise');

    for r_prof in select id, full_name from public.profiles loop
      if (
        new.content ilike '%' || '@' || coalesce(r_prof.full_name, '') || '%'
        and new.author_id is distinct from r_prof.id
      ) then
        v_url := case when v_area = 'analise' then '/kanban/analise?card=' else '/kanban?card=' end || new.card_id::text;

        insert into public.inbox_notifications(
          user_id,
          type,
          priority,
          title,
          body,
          comment_id,
          card_id,
          applicant_id,
          transient,
          link_url,
          meta
        )
        values (
          r_prof.id,
          'comment',
          'low',
          '💬 Nova menção',
          left(coalesce(new.content, ''), 600),
          new.id,
          new.card_id,
          v_applicant_id,
          false,
          v_url,
          jsonb_build_object(
            'author_name', v_author,
            'content_preview', left(coalesce(new.content, ''), 600),
            'primary_name', v_applicant_name,
            'applicant_name', v_applicant_name,
            'card_title', v_applicant_name
          )
        );
      end if;
    end loop;

    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- 5) Backfill existing comment notifications with applicant metadata
with enriched as (
  select
    n.id,
    kc.applicant_id as applicant_id,
    a.primary_name as applicant_name,
    coalesce(cc.content, n.body) as content
  from public.inbox_notifications n
  join public.kanban_cards kc on kc.id = n.card_id
  left join public.applicants a on a.id = kc.applicant_id
  left join public.card_comments cc on cc.id = n.comment_id
  where n.type = 'comment'
)
update public.inbox_notifications n
set
  applicant_id = coalesce(n.applicant_id, enriched.applicant_id),
  body = enriched.content,
  meta = coalesce(n.meta, '{}'::jsonb) || jsonb_build_object(
    'primary_name', enriched.applicant_name,
    'applicant_name', enriched.applicant_name,
    'card_title', enriched.applicant_name,
    'content_preview', enriched.content
  )
from enriched
where n.id = enriched.id;

-- 6) Clean up existing task notifications (optional - uncomment if you want to delete existing ones)
-- delete from public.inbox_notifications where type = 'task';

-- 7) Update notification_type enum to remove 'task' (requires careful handling)
-- Note: This is commented out as it requires more complex migration steps
-- The enum change should be done in a separate migration if needed
-- alter type notification_type rename to notification_type_old;
-- create type notification_type as enum ('comment', 'card', 'system');
-- alter table public.inbox_notifications alter column type type notification_type using type::text::notification_type;
-- drop type notification_type_old;

-- 8) Helper function to list inbox notifications with derived content
do $$ begin
  create or replace function public.list_inbox_notifications()
  returns table (
    id uuid,
    user_id uuid,
    type text,
    priority notification_priority,
    title text,
    body text,
    content text,
    meta jsonb,
    card_id uuid,
    comment_id uuid,
    link_url text,
    transient boolean,
    expires_at timestamptz,
    read_at timestamptz,
    created_at timestamptz,
    applicant_id uuid
  )
  language sql
  security definer
  set search_path = public
  as $f$
    select
      n.id,
      n.user_id,
      n.type::text,
      n.priority,
      n.title,
      n.body,
      coalesce(
        (
          case
            when (n.meta ? 'note_id') and kc.reanalysis_notes is not null then
              (
                select elem->>'text'
                from jsonb_array_elements(kc.reanalysis_notes) elem
                where (elem->>'id')::uuid = (n.meta->>'note_id')::uuid
                limit 1
              )
          end
        ),
        (
          select cc.content from public.card_comments cc where cc.id = n.comment_id
        ),
        n.body
      ) as content,
      n.meta,
      n.card_id,
      n.comment_id,
      n.link_url,
      n.transient,
      n.expires_at,
      n.read_at,
      n.created_at,
      n.applicant_id
    from public.inbox_notifications n
    left join public.kanban_cards kc on kc.id = n.card_id
    where n.user_id = auth.uid()
      and n.type <> 'task'
      and (n.expires_at is null or n.expires_at > now())
    order by n.created_at desc;
  $f$;
  grant execute on function public.list_inbox_notifications() to authenticated;
exception when others then null; end $$;
