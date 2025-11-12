# Editar Ficha

Objetivo: visualizar/editar dados essenciais da ficha, com pareceres, conversas, tarefas e anexos.

Principais arquivos:
- `EditarFichaModal.tsx`: orquestração do modal (seções, agendamento, pareceres, conversas)
  usando subcomponentes e utilitários locais.
- `components/Layout.tsx`: `Section` e `Grid` reutilizáveis.
- `components/Fields.tsx`: `Field`, `Select`, `SelectAdv` (inputs básicos padronizados).
- `components/CmdDropdown.tsx`: dropdown de comandos do parecer (decisões/ações).
- `utils/decision.tsx`: `DecisionTag`, `decisionPlaceholder` e metadados de decisão.
- `types.ts`: `AppModel` e tipos auxiliares da feature.
- `constants.ts`: opções de `PLANO_OPTIONS`, `SVA_OPTIONS`, `VENC_OPTIONS`.
- `components/ui/date-single-kanban-popover.tsx`: calendário puro React (single) para agendamento.
- `features/comments/*`: conversas/menções.
- `features/attachments/*`: anexos (lista, abrir, remover).

Conexões:
- Banco: `public.applicants`, `public.kanban_cards` (due_at/hora_at), `public.card_comments`, `public.card_attachments`.
- DRY/SoC: serviços no respectivo `services.ts`; links de anexo on‑demand para evitar 400.
