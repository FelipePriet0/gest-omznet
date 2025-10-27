-- applicants: base data for PF/PJ

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  person_type person_type not null,
  primary_name text not null,
  cpf_cnpj text not null unique,
  phone text,
  whatsapp text,
  email text,
  address_line text,
  address_number text,
  bairro text,
  cep text,
  address_complement text,
  plano_acesso text,
  venc text,
  carne_impresso boolean not null default false,
  sva_avulso text,
  quem_solicitou text,
  telefone_solicitante text,
  protocolo_mk text,
  meio text,
  info_spc text,
  info_pesquisador text,
  info_relevantes text,
  info_mk text,
  parecer_analise text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
drop trigger if exists trg_applicants_set_updated_at on public.applicants;
create trigger trg_applicants_set_updated_at
before update on public.applicants
for each row execute function public.set_updated_at();

alter table public.applicants enable row level security;

