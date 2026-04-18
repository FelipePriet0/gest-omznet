# AGENTS.md

Este arquivo define as regras operacionais padrão para agentes que atuam neste repositório.

## Regra principal

- A fonte de verdade do código é o repositório Git remoto (`origin` / GitHub).
- O servidor de produção não é o workspace principal de desenvolvimento.
- O fluxo padrão é: desenvolvimento local -> `git push` -> merge em `main` -> deploy no servidor com `git pull`.

## Regras obrigatórias

- Trabalhe em branches `feat/*`, `fix/*`, `chore/*` ou `hotfix/*`.
- Não trabalhe diretamente em `main`, exceto se o usuário pedir explicitamente uma correção urgente com esse fluxo.
- Ambiente local e testes devem apontar para Supabase `DEV`, nunca para `PROD`.
- Toda mudança de banco deve gerar migration SQL versionada no repositório.
- Antes de concluir uma tarefa, execute as validações relevantes do escopo alterado.
- Para mudanças web, o mínimo esperado é `npm run lint`, `npm run build` e Playwright relevante ao fluxo alterado, quando aplicável.
- Nunca usar produção como ambiente de teste exploratório.
- Nunca aplicar mudança destrutiva em banco de produção sem pedido explícito do usuário.

## Deploy padrão

- Merge em `main`
- Aplicar migrations aprovadas em `PROD`
- Entrar no servidor
- Rodar `git pull`
- Reinstalar dependências se necessário
- Build/restart do serviço
- Smoke test pós-deploy

## Documento detalhado

Leia e siga sempre:

- [docs/30-policies/fluxo-de-desenvolvimento-testes-e-deploy.md](docs/30-policies/fluxo-de-desenvolvimento-testes-e-deploy.md)
