📘 Glossário — Sistema Interno MZNET

👥 Papéis de Usuário
Papel	Descrição	Permissões principais
Vendedor	Responsável por gerar novas fichas de clientes (PF/PJ).	Criar e visualizar fichas criadas; acompanhar status no Kanban.
Analista	Valida dados de cadastro, realiza análises e deixa pareceres.	Editar fichas em análise, mover cards no Kanban, criar comentários e anexos.
Gestor	Supervisiona o fluxo, revisa decisões e acompanha performance da equipe.	Acesso total a todas as fichas e dashboards.
Admin	Controle técnico e de permissões do sistema.	Gerencia usuários, configurações e RLS.

🗂️ Estruturas-Chave do Sistema
Termo	Significado
Ficha	Registro de cadastro de um cliente (PF ou PJ). Possui informações básicas em applicants e detalhes adicionais em pf_fichas ou pj_fichas.
Card	Representa uma ficha dentro do Kanban. Pode conter tarefas, comentários e anexos.
Kanban	Quadro de etapas do fluxo de análise. Cada coluna representa um estágio (ex: Entrada, Em análise, Aprovado, Negado).
Coluna (Stage)	Etapa dentro do Kanban. Mudanças entre colunas disparam triggers (notificações, logs).
Tarefa (Task)	Ação atribuída a um colaborador. Vinculada a um card.
Comentário	Comunicação interna vinculada a um card, podendo ter respostas hierárquicas.
Anexo	Arquivo vinculado a um card ou mensagem (PDF, imagem, documento).
Notificação (Inbox)	Alerta recebido por um usuário quando há interações relevantes (ex: comentário, tarefa nova, mudança de status).
Log de Exclusão	Registro histórico de itens removidos do sistema (auditoria completa).

🧩 Entidades Principais e Relações
Entidade	Relações
profiles	↔ auth.users (1:1). Guarda informações de colaboradores.
applicants	Base de todos os clientes (PF/PJ).
pf_fichas	↔ applicants.id (1:1). Detalhes de pessoas físicas.
pj_fichas	↔ applicants.id (1:1). Detalhes de pessoas jurídicas.
kanban_cards	↔ applicants.id (1:N). Cada cliente possui 1+ cards no fluxo.
card_tasks	↔ kanban_cards.id (1:N). Cada card tem várias tarefas.
card_comments	↔ kanban_cards.id (1:N) e autor em profiles.id.
card_attachments	↔ kanban_cards.id (1:N) e uploader em profiles.id.
inbox_notifications	↔ profiles.id (destinatário) + relacionamentos com cards, tasks, comments.
deletion_log	Relaciona-se com qualquer tabela; captura metadados de exclusão.

⚙️ Conceitos Técnicos Relevantes

Termo	Significado simplificado
Supabase Auth	Serviço de autenticação nativo. Controla login e sincroniza IDs com profiles.
RLS (Row Level Security)	Política de segurança que limita o acesso de cada usuário às linhas do banco que lhe pertencem.
Edge Function	Função executada no backend (Supabase) responsável por lógicas personalizadas (ex: triggers, notificações, movimentação de cards).
Hook (Frontend)	Ponto de conexão entre o React e os dados da tabela correspondente (ex: useApplicants(), useCards()).
Trigger	Ação automática no banco (ex: mover card gera notificação e atualização de histórico).
DTO (Data Transfer Object)	Estrutura tipada que define o formato esperado de dados entre frontend e backend.
Zod Schema	Validação tipada dos dados antes de enviar ao backend.
💡 Convenções de Nomenclatura
Tipo	Padrão
Pastas	kebab-case (ex: kanban-cards/)
Componentes React	PascalCase (ex: KanbanBoard.tsx)
Hooks e funções	camelCase (ex: useApplicants(), moveCard())
Tabelas no banco	snake_case (ex: kanban_cards)
Campos no banco	snake_case (ex: created_at, user_id)
Enum values	lowercase (ex: analise, comercial, gestor)


📑 Legendas dos Documentos Técnicos
Documento	Função
00-spec.md	Descreve a intenção da feature, critérios de pronto e fluxo principal.
01-data.md	Lista tabelas, colunas e relacionamentos usados.
02-ux.md	Mostra telas, estados e interações do usuário.
03-api.md	Define rotas, payloads e contratos de API.
04-rls.md	Explica regras de segurança e visibilidade.
05-acceptance.md	Define checklist de testes e critérios de aceite.