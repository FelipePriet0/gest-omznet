-- Adiciona colunas de metadados do autor que faltavam na tabela card_attachments
ALTER TABLE public.card_attachments
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS author_role text;
