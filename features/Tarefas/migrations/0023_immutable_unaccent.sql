-- Immutable unaccent wrapper + safe trigram indexes for text search
-- Usage: run this after 0021/0022 if you saw 42P17 (IMMUTABLE) errors

-- Ensure extensions exist (no-op if already installed)
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Create an IMMUTABLE wrapper for unaccent so it can be used in index expressions
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$ select public.unaccent('public.unaccent', $1) $$;

-- Applicants: trigram index on unaccented primary_name
create index if not exists idx_applicants_name_trgm
  on public.applicants using gin (public.f_unaccent(primary_name) gin_trgm_ops);

-- Card tasks: trigram index on unaccented description
create index if not exists idx_card_tasks_desc_trgm
  on public.card_tasks using gin (public.f_unaccent(description) gin_trgm_ops);

