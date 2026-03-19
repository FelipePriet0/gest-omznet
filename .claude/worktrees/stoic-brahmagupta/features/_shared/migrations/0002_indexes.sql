-- Helpful indexes

create index if not exists idx_applicants_cpf_cnpj on public.applicants (cpf_cnpj);

create index if not exists idx_pf_fichas_applicant on public.pf_fichas (applicant_id);

create index if not exists idx_pj_fichas_applicant on public.pj_fichas (applicant_id);
create index if not exists idx_pj_fichas_deleted_at on public.pj_fichas (deleted_at);

create index if not exists idx_kanban_cards_applicant on public.kanban_cards (applicant_id);
create index if not exists idx_kanban_cards_assignee on public.kanban_cards (assignee_id);
create index if not exists idx_kanban_cards_area on public.kanban_cards (area);
create index if not exists idx_kanban_cards_stage on public.kanban_cards (stage);
create index if not exists idx_kanban_cards_created_by on public.kanban_cards (created_by);
create index if not exists idx_kanban_cards_deleted_at on public.kanban_cards (deleted_at);

