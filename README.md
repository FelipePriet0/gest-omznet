# Gestão MZ (Main)

Plataforma interna para organizar o processo dos setores Comercial e Análise da Mznet, com Kanban, Inbox, Tasks e colaboração em tempo real.

## Por que esse projeto existe?

- Dor:
  - Fichas em PDF (Adobe Acrobat) circulando em grupos de WhatsApp.
  - Conversas de análise e alinhamentos dispersos entre múltiplos grupos (Comercial e Análise).
  - Perda de contexto, retrabalho e dificuldade de rastreabilidade.
- Limite das soluções genéricas: Kanbans genéricos como Trello/ClickUp, entre outros, suportariam nosso processo sem problemas. Mas não teríamos o banco e a possibilidade de aprendizado via dados que uma plataforma própria oferece, o que abre portas para treinamento de LLMs, resultando em agentes específicos para compor nosso time e melhores tomadas de decisão.
- Decisão estratégica: centralizar dados e regras no Postgres (via Supabase), expondo operações por RPC e usando Realtime para sincronismo da UI, criando um banco sólido e valioso para o longo prazo.

> Nota: Não somos um CRM (ainda); somos uma plataforma de gestão do processo interno, com foco em organizar e acelerar o trabalho, ganhando produtividade através de organização.

## O que essa aplicação faz?

- Fluxo principal: Kanban para mover fichas por estágios (ambos os setores) → criação de ficha (Comercial) → abrir ficha para análise → registrar pareceres/conversas/tarefas/anexos → notificar envolvidos → acompanhar prazos (data de agendamento).
- Quem usa: áreas Comercial e Análise.
- Resultado: previsibilidade do pipeline, redução de retrabalho, decisões rastreáveis, unificação de ferramentas (organização e rapidez no processo), gestão da equipe e redução de perdas de cadastros e fichas entre ferramentas separadas.

## Stack e decisões técnicas

- Frontend: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4.
- UI: Radix UI + shorthands utilitários (`clsx`, `tailwind-merge`).
- Backend de dados: Supabase (Postgres, RPC, Realtime, Auth).
- Estado/Reatividade: canais Realtime para sync de comentários, anexos, cartões e notificações.

Por que essas escolhas:
- Next.js App Router: roteamento file-based e Server/Client Components quando útil, mantendo DX moderna.
- Tailwind 4: tokens utilitários consistentes e baixo acoplamento de estilos.
- Supabase: acelera autenticação, acesso a dados (PostgREST/RPC), Realtime nativo e reduz boilerplate de backend.
- RPC para regras críticas (ex.: `change_stage`): concentra invariantes no banco, com fallback no cliente se necessário.

## Arquitetura e conceitos‑chave

Modelo mental (1 min):
- Objeto central: `kanban_cards` representa o trabalho em andamento (WIP) por área/estágio.
- Dado mestre: `applicants` guarda a ficha e informações do cliente/cadastro.
- Histórico operacional: conversas/pareceres em `card_comments` e anexos em `card_attachments` (auditáveis por timestamps e autor).
- Eventos: `inbox_notifications` registra fatos direcionados a usuários; “lido” é estado por usuário (coluna `read_at`).
- Source of truth: estágio em `kanban_cards.stage`; agenda em `kanban_cards.due_at`/`hora_at`; responsável atual em `kanban_cards.assignee_id`.

Relações principais:
- `applicants` 1—N `kanban_cards`.
- `kanban_cards` 1—N `card_comments` (threads e replies por `parent_id`/`thread_id`).
- `kanban_cards` 1—N `card_attachments` (podem referenciar um comentário via `comment_id`).
- `kanban_cards` 1—N `card_tasks` (tarefa opcional vinculada a comentário via `comment_id`).
- `profiles` 1—1 `auth.users` (mesmo `id`); `profiles.role` define papel interno.
- `inbox_notifications` N—1 `profiles` (destinatário via `user_id`).

Invariantes (regras do jogo):
- Transições de estágio devem ocorrer via RPC `change_stage` (fonte de verdade). Atualização direta é restrita a migrações/admin e nunca usada na UI.
- Ao mudar estágio (área de Análise):
  - `recebidos` → limpa `assignee_id`.
  - `em_analise` → define `assignee_id` quando informado.
  - Ajustes de decisão via RPC `set_card_decision` (ex.: `aprovado`/`negado`/`reanalise`).
- Comentários:
  - Não criar reply órfão (validar `parent_id` do mesmo `card_id`).
  - Preferir soft‑delete quando suportado (`deleted_at`), preservando histórico.
  - Edição atualiza `updated_at`; manter ordem cronológica por `created_at`.
- Anexos:
  - Pertencem ao `card_id` e podem apontar a um comentário (`comment_id`).
  - Acesso via URL assinada do Storage; metadados em `card_attachments` são a referência oficial.
- Notificações:
  - São imutáveis após criação; apenas o campo `read_at` muda (estado por usuário).
- Agenda e horários: `due_at` e `hora_at` no `kanban_cards` são a única fonte para filtros e métricas.

Cardinalidade e WIP por applicant:
- Não existe `kanban_cards` sem `applicants` (FK obrigatória).
- Pode existir `applicants` sem `kanban_cards` (cadastro prévio sem trabalho ativo).
- Regra crítica: no máximo 1 card ativo por applicant por área.
  - "Ativo" = `deleted_at` é null e `stage` não é um estágio final/cancelado.
  - Deve ser garantido via RPC/constraints (p.ex., unique parcial por (`applicant_id`,`area`) onde ativo).

Permissões (Auth/RLS/roles):
- Auth: login Supabase; `profiles.id = auth.users.id` e guarda `role` (ex.: Comercial, Análise, Admin).
- RLS (intent): políticas no banco restringem leitura/escrita ao escopo do usuário/role; operações críticas são preferencialmente via RPC.
- UI respeita papéis para exibir ações e filtros; o banco valida autorizações.

Separação de responsabilidades:
- UI declara intenção e orquestra; `services.ts` concentra Supabase (RPC/queries) e tratamento de erros.
- Realtime atualiza a UI; integridade e regras ficam no banco (constraints/RLS/RPC).

## Funcionalidades

✅ Implementado

Kanban de Operações (Comercial & Análise)
- O que permite: visualizar e organizar fichas por estágio do fluxo.
- O que garante: mudança de estágio altera estado de negócio e gera histórico/notificações conforme regras.
- Limites: suporta filtros, métricas e ordenação; decisões de integridade permanecem no banco.

Gestão de Ficha (Applicant)
- O que permite: editar dados essenciais; registrar pareceres e conversas (histórico).
- O que garante: tarefas e anexos podem ser associados ao card/ficha mantendo rastreabilidade.
- Limites: histórico é preferencialmente append-only; deleções seguem política de soft-delete quando disponível.

Inbox de Eventos
- O que permite: centralizar notificações por tipo (movimentação, comentário, agendamento).
- O que garante: estado de leitura é individual por usuário; eventos relevantes atualizam em tempo real.
- Limites: notificações são fatos imutáveis; apenas o estado de leitura muda.

Agendamento
- O que permite: datas e horários vinculados à ficha/kanban para operação diária.
- O que garante: serve como referência operacional (agenda) para priorização e métricas.
- Limites: não atua como motor de workflow; decisões são tomadas nas regras de estágio.

🚧 Em andamento
- Melhorias de UX em fluxos críticos (teclado, acessibilidade, velocidade de interação).

🧠 Planejado
- Centralizar regras transversais em RPCs (auditoria e consistência transacional).
- Instrumentação mínima de erros e performance nos fluxos principais (observabilidade pragmática).
- Testes end‑to‑end nos fluxos Kanban/Inbox/Editar Ficha (estabilidade operacional contínua).

📚 Documentação detalhada por feature
- `web/features/kanban/README.md`
- `web/features/inbox/README.md`
- `web/features/editar-ficha/README.md`

## Como rodar localmente

Pré‑requisitos
- Node.js 18+ (recomendado 20 LTS)
- NPM (ou Yarn/PNPM/Bun) — exemplos abaixo com NPM
- Projetos/Schemas no Supabase configurados (tabelas e RPCs citados)

Passos
1) Entre no app web: `cd web`
2) Crie `.env.local` com as variáveis abaixo
3) Instale: `npm install`
4) Rode: `npm run dev` e acesse `http://localhost:3000`

## Variáveis de ambiente

No arquivo `web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_USE_CHANGE_STAGE_RPC=true
```

Observações
- Se `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` não estiverem configuradas, o cliente usa um stub local e desativa persistência/auto refresh.
- Ajuste `NEXT_PUBLIC_USE_CHANGE_STAGE_RPC` conforme disponibilidade do RPC `change_stage` no banco.

## Padrões e convenções

**Organização**
- Estrutura por feature em `web/features/<feature>` para encapsular lógica, UI e integrações.
- Cada feature mantém README próprio quando houver regra ou fluxo não trivial.

**Rotas e composição**
- Páginas em `web/app/(app)/...` apenas compõem features e lidam com navegação.
- Não colocar lógica de negócio em pages/layouts (apenas orquestração de view/state).

**Acesso a dados**
- Integrações com Supabase (RPC/queries) passam por `services.ts` da feature.
- É proibido acessar Supabase diretamente de componentes de UI (inclui pages/layouts).
- Não chamar RPC dentro de componentes; sempre via funções de serviço (testáveis e reaproveitáveis).

**Realtime**
- Assinaturas ficam em hooks/efeitos dedicados por feature.
- Todo canal deve ser removido no cleanup (evitar vazamentos e eventos duplicados).

**UI**
- Tokens/utilitários globais em `app/globals.css`.
- Componentes reutilizáveis em `components/*`; evitar duplicação dentro de features.

**Versionamento**
- Branches por feature (`feat/<nome>`); PRs pequenos, focados e revisáveis.
- Commits claros; Conventional Commits recomendado (não obrigatório).

## Roadmap

- [ ] Refinar filtros/indicadores do Kanban e métricas por estágio.
- [ ] Melhorias de acessibilidade e navegação por teclado.
- [ ] Cobertura de testes nos fluxos Kanban/Inbox/Editar Ficha.
- [ ] Auditoria mínima (quem mudou o quê e quando) nas operações sensíveis.

> Use este bloco como guia vivo; priorize e edite conforme a squad.

## Status do projeto

Em desenvolvimento interno (MVP). Ajuste aqui quando for para produção.

---

Anotações rápidas
- Stack confirmada no `web/package.json` (Next 16, React 19, Tailwind 4, Supabase JS).
- Env chaves: `web/lib/supabaseClient.ts` e feature flags em serviços (Kanban).
- Para dúvidas de fluxo/arquivos, consulte os READMEs de feature e os diretórios indicados acima.
