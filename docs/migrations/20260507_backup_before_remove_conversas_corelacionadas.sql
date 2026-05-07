create schema if not exists backup_remove_conversas_20260507;

create table if not exists backup_remove_conversas_20260507.card_comments as
select * from public.card_comments;

create table if not exists backup_remove_conversas_20260507.card_attachments_with_comment as
select * from public.card_attachments where comment_id is not null;

create table if not exists backup_remove_conversas_20260507.card_tasks_with_comment as
select * from public.card_tasks where comment_id is not null;

create table if not exists backup_remove_conversas_20260507.inbox_notifications_with_comment as
select * from public.inbox_notifications where comment_id is not null;

comment on schema backup_remove_conversas_20260507 is
  'Backup created before removing Conversas Co-relacionadas on 2026-05-07.';
