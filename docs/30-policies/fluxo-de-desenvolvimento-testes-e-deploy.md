# Fluxo de Desenvolvimento, Testes e Deploy

## Objetivo

Definir uma regra única para evolução do sistema, cobrindo:

- como abrir novas features e correções
- como usar Git e branches
- como separar `DEV` e `PROD`
- como tratar migrations de banco
- como validar mudanças antes do merge
- como publicar a versão no servidor

Este documento deve ser seguido por devs humanos e agentes de código.

## Regra mestra

- O código-fonte oficial vive no Git remoto (`origin` / GitHub).
- O servidor de produção consome o código do Git via `git pull`.
- O servidor não deve ser tratado como ambiente principal de desenvolvimento.
- O ambiente local deve apontar para banco `DEV`.
- O banco `PROD` não deve ser usado para testes exploratórios, desenvolvimento diário ou validação de feature incompleta.

## Decisão operacional atual da stack

Para esta stack, a estratégia padrão é:

- branch por feature ou correção
- banco `DEV` separado do banco `PROD`
- migrations SQL versionadas no repositório
- validação local com `lint`, `build`, testes E2E e smoke manual
- deploy manual no servidor após merge aprovado

Isso é o melhor equilíbrio atual entre segurança, velocidade e simplicidade para o projeto.

## Estado atual do projeto

Hoje o projeto já possui:

- frontend em Next.js
- acesso direto ao Supabase no app web por variáveis `NEXT_PUBLIC_*`
- Playwright configurado para testes E2E
- migrations SQL versionadas dentro do repositório

Implicação prática:

- se alguém apontar o `.env.local` para `PROD`, o navegador passa a operar em produção
- por isso a separação entre `DEV` e `PROD` não é opcional; ela é obrigatória

## Ambientes

### `LOCAL`

Uso:

- desenvolvimento diário
- validação manual
- execução de `lint`, `build` e testes

Regras:

- roda na máquina do dev ou agente
- usa código de branch local
- aponta para Supabase `DEV`
- nunca aponta para Supabase `PROD`

### `DEV`

Uso:

- desenvolvimento integrado
- testes manuais com dados realistas
- validação de migrations
- execução de fluxos E2E

Regras:

- deve ter dados de teste estáveis
- deve ter usuários de teste próprios
- pode ter seed controlado para cenários PF/PJ, Kanban, Inbox e Agenda
- não deve depender de IDs de produção

### `PROD`

Uso:

- operação real do negócio

Regras:

- recebe apenas código já validado
- recebe migrations aprovadas
- não é ambiente de experimento
- qualquer teste em produção deve ser somente smoke test objetivo e controlado

## Estratégia de branches

### Branches padrão

- `main`: versão apta a produção
- `feat/<nome-curto>`: nova funcionalidade
- `fix/<nome-curto>`: correção de bug
- `chore/<nome-curto>`: manutenção técnica, ajustes não funcionais, tooling
- `hotfix/<nome-curto>`: correção urgente de produção

### Regras de branch

- não desenvolver direto em `main`
- uma branch deve resolver um problema claro
- PRs devem ser pequenos o suficiente para revisão real
- se a demanda crescer demais, quebrar em entregas menores

## Fonte de verdade

- O GitHub é a fonte de verdade do código.
- O servidor de produção é apenas consumidor da versão aprovada.
- O fluxo normal não é editar no servidor; é publicar no Git e depois atualizar o servidor.

## Banco de dados

## Regra principal

- Todo desenvolvimento normal usa banco `DEV`.
- `PROD` só recebe mudanças aprovadas.

## O que isso evita

- testar feature inacabada em dados reais
- quebrar operação por migration parcialmente validada
- alterar dados de produção durante experimentação
- mascarar bugs porque o ambiente local está acoplado à base real

## Migrations

Toda mudança de schema, policy, RPC, trigger, index ou view deve:

1. existir como SQL versionado no repositório
2. ser aplicada primeiro em `DEV`
3. ser validada com a aplicação rodando em `DEV`
4. só depois ser aplicada em `PROD`

## Onde versionar migrations

O repositório já possui dois padrões em uso:

- migrations por feature em `features/*/migrations`
- scripts/migrations operacionais em `docs/migrations`

Regra recomendada daqui para frente:

- mudanças ligadas a uma feature devem ficar na pasta de migrations da própria feature
- correções transversais, ajustes operacionais e scripts de hardening podem ficar em `docs/migrations`
- toda migration deve ter nome claro, com data ou ordem suficiente para rastrear execução

## Regras para migrations seguras

- preferir mudanças aditivas primeiro
- evitar renomear ou remover algo que a aplicação atual ainda usa
- quando necessário, fazer deploy em duas etapas:
  - etapa 1: adicionar estrutura nova e manter compatibilidade
  - etapa 2: migrar código
  - etapa 3: remover legado depois da estabilização

## Dados de teste

O ambiente `DEV` deve manter, no mínimo:

- um usuário analista de teste
- um usuário comercial de teste
- um conjunto pequeno de fichas PF/PJ estáveis
- cards e dados suficientes para validar Kanban, Inbox e Editar Ficha

Motivo:

- os testes E2E atuais dependem de login e IDs reais
- sem dados estáveis, o teste vira improviso

## Estratégia de testes

## Regra prática atual

Como o projeto já tem Playwright e ainda não tem suíte unitária consolidada, o mínimo obrigatório hoje é:

- `lint`
- `build`
- teste manual dirigido no fluxo alterado
- Playwright relevante, quando o fluxo já estiver coberto

## Tipos de validação

### 1. Validação estática

Rodar:

```bash
cd web
npm run lint
```

Serve para:

- erros simples de código
- imports inválidos
- problemas básicos de qualidade

### 2. Validação de build

Rodar:

```bash
cd web
npm run build
```

Serve para:

- garantir que a aplicação fecha em produção
- detectar quebra de compilação, tipos e rotas

### 3. Teste E2E

Scripts já existentes:

```bash
cd web
npm run test:e2e
npm run test:e2e:pf
npm run test:e2e:pj
```

Quando usar:

- mudanças em cadastro PF/PJ
- mudanças em login
- mudanças em fluxos críticos
- regressões em telas principais

Observação:

- se a feature não tiver cobertura E2E ainda, fazer teste manual dirigido e considerar adicionar cobertura em seguida

### 4. Smoke manual

Sempre validar manualmente o trecho alterado:

- abrir a tela
- reproduzir o fluxo principal
- testar estado feliz
- testar pelo menos um estado de erro ou borda
- confirmar que nada óbvio da área adjacente quebrou

## O que é esperado para novas features

Para novas features, seguir esta ordem:

1. abrir branch própria
2. implementar UI e integração em `DEV`
3. criar migration se houver mudança de banco
4. validar manualmente a feature
5. rodar `lint`
6. rodar `build`
7. rodar Playwright relevante ou registrar que ainda não existe cobertura
8. só então abrir PR ou preparar merge

## Fluxo padrão de trabalho

## Nova feature

1. atualizar `main` local
2. criar branch `feat/<nome>`
3. garantir `.env.local` apontando para `DEV`
4. implementar a feature
5. criar migrations necessárias
6. aplicar migration em `DEV`
7. validar o fluxo manualmente
8. rodar `lint`
9. rodar `build`
10. rodar teste E2E aplicável
11. fazer `git add`, `commit` e `push`
12. abrir PR ou preparar merge

## Correção de bug

1. criar branch `fix/<nome>`
2. reproduzir o bug em `DEV`
3. corrigir
4. validar cenário corrigido
5. validar que o fluxo vizinho não regrediu
6. rodar checks mínimos
7. subir a branch

## Hotfix

Usar apenas quando o problema estiver em produção e não puder esperar o fluxo normal.

Regras:

- branch `hotfix/<nome>`
- correção mínima e objetiva
- evitar refatoração no mesmo pacote
- validar rapidamente em ambiente controlado
- merge rápido
- deploy imediato com smoke test

## Regra de deploy

## Fluxo de publicação em produção

1. código aprovado e já mergeado em `main`
2. migrations de `PROD` revisadas e aplicadas
3. entrar no servidor via SSH
4. acessar a pasta do projeto
5. rodar `git pull`
6. reinstalar dependências se houve mudança de lockfile ou pacote
7. gerar build ou reiniciar serviço conforme a stack do servidor
8. executar smoke test pós-deploy

## Ordem recomendada quando há mudança de banco

Se a migration for compatível com a versão atual:

1. aplicar migration em `PROD`
2. atualizar código no servidor
3. build/restart
4. smoke test

Se a migration quebrar compatibilidade:

- não fazer deploy em passo único
- redesenhar para rollout compatível em etapas

## Exemplos de comandos de validação e deploy

### Validação local

```bash
cd web
npm run lint
npm run build
npm run test:e2e:pf
```

### Atualização do servidor

```bash
git pull origin main
```

Se necessário, também:

```bash
cd web
npm install
npm run build
```

Observação:

- o comando exato de restart depende do servidor e do processo atual (`pm2`, `systemd`, Docker, etc.)

## Regras mandatórias para agentes de código

Um agente atuando neste repositório deve assumir por padrão que:

- precisa trabalhar em branch própria
- não pode usar `PROD` como ambiente de teste
- não pode apontar `.env.local` para produção
- não pode considerar uma mudança de banco concluída sem migration versionada
- não pode editar diretamente o servidor como fluxo normal
- não deve tratar o servidor como fonte de verdade
- deve relatar quais validações executou e quais não executou
- deve explicitar riscos se não conseguiu validar banco, build ou fluxo crítico

## O que o agente deve fazer ao tocar banco

- procurar migrations existentes da área
- criar nova migration versionada
- aplicar em `DEV`
- validar o fluxo da aplicação com a migration aplicada
- instruir deploy em `PROD` na ordem correta

## O que o agente deve fazer ao tocar frontend crítico

- validar a tela alterada manualmente
- rodar `lint`
- rodar `build`
- rodar Playwright relevante se existir
- se não existir cobertura automatizada, registrar essa lacuna

## O que o agente não deve fazer

- desenvolver direto em `main`
- usar IDs de produção como dependência do fluxo de testes
- fazer teste exploratório em produção
- aplicar SQL destrutivo em produção sem pedido explícito
- concluir tarefa grande sem informar as validações reais executadas

## Convenção resumida

Use sempre este raciocínio:

`branch própria -> DEV -> migration versionada -> lint/build/teste -> merge main -> migration PROD -> git pull no servidor -> restart -> smoke`

## Relação com outros documentos

- este documento complementa o overview geral do sistema
- este documento complementa as definições de pronto
- este documento não substitui políticas de acesso e permissão no banco

## Checklist rápido antes de concluir uma task

- branch correta
- ambiente local em `DEV`
- sem uso de `PROD` para teste
- migration versionada, se houve mudança de banco
- `lint` executado
- `build` executado
- teste manual executado
- E2E executado ou lacuna registrada
- pronto para merge
- pronto para deploy com `git pull` no servidor
