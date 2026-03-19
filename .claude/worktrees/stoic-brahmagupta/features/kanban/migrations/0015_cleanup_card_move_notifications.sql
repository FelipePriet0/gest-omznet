-- Cleanup previously created notifications for card moves (now disabled)

do $$ begin
  delete from public.inbox_notifications
  where type = 'card'
    and coalesce(title, '') = 'Card movido';
exception when others then null; end $$;

