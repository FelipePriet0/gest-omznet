-- Performance indexes for Minhas Tarefas
-- Enables faster filtering by status/assigned_to/deadline and text search with unaccent + trigram.

-- Extensions (safe: no-op if already installed)
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Card tasks: composite filter by assignee + status + deadline
create index if not exists idx_card_tasks_assigned_status_deadline
  on public.card_tasks (assigned_to, status, deadline);

-- Card tasks: functional index to support lower(status) comparisons
create index if not exists idx_card_tasks_status_lower
  on public.card_tasks ((lower(status)));

-- Applicants: text search on applicant_name with unaccent + ILIKE
create index if not exists idx_applicants_name_trgm
  on public.applicants using gin (unaccent(primary_name) gin_trgm_ops);

-- Card tasks: text search on description with unaccent + ILIKE
create index if not exists idx_card_tasks_desc_trgm
  on public.card_tasks using gin (unaccent(description) gin_trgm_ops);

