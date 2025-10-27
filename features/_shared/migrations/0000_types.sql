-- Shared types and extensions
create extension if not exists pgcrypto;

-- User roles within the system
do $$ begin
  create type user_role as enum ('vendedor', 'analista', 'gestor');
exception when duplicate_object then null; end $$;

-- Person type for applicants and cards
do $$ begin
  create type person_type as enum ('PF', 'PJ');
exception when duplicate_object then null; end $$;

-- Kanban areas
do $$ begin
  create type kanban_area as enum ('comercial', 'analise');
exception when duplicate_object then null; end $$;

-- Notification types and priority (future use)
do $$ begin
  create type notification_type as enum ('task', 'comment', 'card', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

-- Task status (future use)
do $$ begin
  create type task_status as enum ('pendente', 'concluida');
exception when duplicate_object then null; end $$;

