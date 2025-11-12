# Inbox (Caixa de Entrada)

Objetivo: listar notificações (menções, respostas em parecer/comentários) do usuário, com filtros por tipo e remoção otimista.

Principais arquivos:
- `InboxDrawer.tsx`: orquestração da UI (filtros, métricas, lista) usando subcomponentes.
- `components/DashboardCard.tsx`: cards de métrica.
- `components/InboxFilterCTA.tsx`: seletor de filtro (popover/command).
- `components/InboxNotificationsStack.tsx`: lista com swipe para marcar como lida.
- `components/NotificationCard.tsx`: cartão de notificação individual.
- `hooks/useInboxController.ts`: estado, carregamento e realtime (SoC forte).
- `services.ts`: integração com RPC `list_inbox_notifications()` e `markRead()`.

Conexões:
- Banco: `public.inbox_notifications` via RPC; Realtime para atualizações.
- DRY: usa `content` (snapshot) e metadados resolvidos no RPC (sem depender de `title/body`).
