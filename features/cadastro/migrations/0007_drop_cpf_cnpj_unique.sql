-- Remove unique constraint from cpf_cnpj to allow duplicate CPF/CNPJ registrations
alter table public.applicants drop constraint if exists applicants_cpf_cnpj_key;
