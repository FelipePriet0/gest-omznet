# Kanban (Comercial / Análise)

Objetivo: visualizar e mover fichas por colunas (drag & drop), com filtros (hora, período, responsáveis) e mini‑dashboards.

Principais arquivos:
- `legacy/components/kanban/components/KanbanBoard.tsx`: board comercial e colunas.
- `legacy/components/kanban/components/KanbanBoardAnalise.tsx`: board de análise.
- `legacy/components/kanban/components/KanbanColumn.tsx`: coluna (header + cards).
- `features/kanban/services.ts`: listagem e `changeStage()` com fallback.
- `app/(app)/kanban/page.tsx` e `app/(app)/kanban/analise/page.tsx`: páginas com filtros e layout.

Conexões:
- Banco: `public.kanban_cards` (lista/movimentação) + Realtime.
- DRY: tokens de UI em `app/globals.css`; serviços centralizados.

