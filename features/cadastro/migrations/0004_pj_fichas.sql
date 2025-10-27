-- pj_fichas: Expanded Ficha PJ

create table if not exists public.pj_fichas (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  data_abertura text,
  nome_fantasia text,
  nome_fachada text,
  area_atuacao text,
  tipo_imovel text,
  obs_tipo_imovel text,
  tempo_endereco text,
  tipo_estabelecimento text,
  obs_estabelecimento text,
  end_ps text,
  fones_ps text,
  enviou_comprovante text,
  tipo_comprovante text,
  nome_comprovante text,
  possui_internet text,
  operadora_internet text,
  plano_internet text,
  valor_internet text,
  contrato_social text,
  obs_contrato_social text,
  socio1_nome text,
  socio1_cpf text,
  socio1_telefone text,
  socio2_nome text,
  socio2_cpf text,
  socio2_telefone text,
  socio3_nome text,
  socio3_cpf text,
  socio3_telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  deletion_reason text
);

drop trigger if exists trg_pj_fichas_set_updated_at on public.pj_fichas;
create trigger trg_pj_fichas_set_updated_at
before update on public.pj_fichas
for each row execute function public.set_updated_at();

alter table public.pj_fichas enable row level security;

