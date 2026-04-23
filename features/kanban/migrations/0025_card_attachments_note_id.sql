-- Adiciona note_id para vincular anexos a pareceres (referência a JSONB, sem FK)
alter table public.card_attachments
  add column if not exists note_id text;

create index if not exists idx_card_attachments_note_id
  on public.card_attachments(note_id)
  where note_id is not null;
