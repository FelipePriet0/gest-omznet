🧭 Visão Geral do Sistema Interno Mznet

🎯 Objetivo Central

Criar uma plataforma única de gestão operacional para todos os times da Mznet, integrando análise de cadastros, tarefas, comentários, anexos e comunicação interna.
O sistema visa eliminar planilhas dispersas, reduzir reprocessos e garantir rastreabilidade total das ações.

🏗️ Arquitetura Geral

Frontend: Next.js + TypeScript + Tailwind (shadcn UI)

Backend: Supabase (Postgres + Edge Functions)

Autenticação: Supabase Auth → tabela profiles (espelha auth.users)

Banco de dados: tabelas versionadas em infra/supabase/

Deploy e Infra: Supabase + Vercel (Turborepo com pnpm workspaces)

⚙️ Módulos Principais
Módulo	Descrição geral	Tabelas envolvidas
Login e Perfil	autenticação, perfil do usuário, papel e avatar	auth.users, profiles
Cadastro de Clientes	fichas PF/PJ com dados básicos e expandido	applicants, pf_fichas, pj_fichas
Kanban de Análise	controle visual de fichas por coluna / etapa	kanban_cards
Tarefas e Subtarefas	divisão de atividades entre colaboradores	card_tasks
Comentários em Cards	discussão contextual dentro das fichas	card_comments
Anexos	upload e armazenamento de documentos em cards	card_attachments
Notificações	alertas automáticos em painel de usuário	inbox_notifications
Canais de Comunicação	mensagens e reações internas por canal	channels, channel_messages, channel_attachments, channel_reactions
Logs e Auditoria	registro de exclusões e ações sensíveis	deletion_log
🔄 Fluxo Macro de Uso

1️⃣ Usuário faz login → sistema cria ou carrega profile.
2️⃣ Equipe comercial gera nova ficha PF/PJ (applicants + pf_fichas/pj_fichas).
3️⃣ Ficha entra no Kanban de Análise → colunas com triggers de movimentação.
4️⃣ Durante a análise, analistas criam comentários, tarefas e anexos.
5️⃣ Ações geram notificações para envolvidos.
6️⃣ Concluída a ficha, movimento final é registrado e auditoria gravada em deletion_log.

🔒 Permissões e Regras

Cada usuário vê somente suas fichas, tarefas e cards atribuídos.

Gestores têm visão geral do fluxo.

RLS aplicada em todas as tabelas principais.

Triggers mantêm consistência (profiles ↔ auth.users, applicants ↔ pf/pj_fichas, etc.).

📈 Benefícios Esperados

Centralização de dados e histórico único por cliente.

Menos retrabalho e erros manuais na análise de cadastros.

Comunicação integrada e rastreável.

Base de dados pronta para relatórios e BI.

🧩 Próximos Passos

Estruturar documentos de feature (docs/features/...).

Implementar Login e Perfil (1ª entrega).

Evoluir para Kanban + Tarefas + Comentários.