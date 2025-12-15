# Agenda

Feature para visualizar e organizar compromissos/atividades por data e horário.

## Objetivo

- Centralizar a visão do dia/semana (ex.: agendamentos do Kanban).
- Permitir filtros básicos (ex.: responsável, estágio, intervalo de datas).

## Rotas

- `/agenda`

## Estrutura

- `web/app/(app)/agenda/page.tsx`: rota que renderiza a página.
- `web/features/agenda/AgendaPage.tsx`: componente raiz da feature.

## Próximos passos

- Definir modelo de dados (fonte: `kanban_cards.due_at`/`hora_at` ou tabela dedicada).
- Desenhar UI (visão diária/semanal) e filtros.
- Integrar com realtime (quando aplicável).
