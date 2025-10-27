### RLS — Row Level Security (Controle de Acesso por Linha)

### 🎯 Objetivo

Definir regras de segurança para o Supabase que determinam **quem pode ver, criar, editar e excluir** dados no sistema interno MZNET, de acordo com o cargo do colaborador.

## Ficha (Expanded PF e PJ)

| Função | Vendedor | Analista | Gestor |
| --- | --- | --- | --- |
| Criar ficha  | ✓ | ✓ | ✓ |
| Ver/Editar ficha do card acessível | ✓ | ✓ | ✓ |
| Excluir ficha | Apenas a Própria | Apenas a Própria | ✓  |

## Kanban

| Função | Vendedor | Analista | Gestor |
| --- | --- | --- | --- |
| Ver quadro Comercial e de outros colaboradores via filtro: “Responsável” | ✓ | ✓ | ✓ |
| Mover cards no Comercial (todas as colunas, incl. **Concluídas**)  | ✓ | ✓ | ✓ |
| Enviar para **Concluídas** (dispara trigger → Análise/Recebidos) | ✓ | ✓ | ✓ |
| Ver quadro Comercial e de outros colaboradores via filtro: “Responsável” | ✓ | ✓ | ✓ |
| Mover para Recebidos  | ✓ (automático via trigger do Comercial)  | ✓  | ✓ |
| Mover Em Análise | ✗ | ✓ | ✓ |
| Mover Reanálise | ✗ | ✓ | ✓ |
| Mover Aprovados/Negados | ✗ | ✓ | ✓ |
| Mover Ass App | ✗ | ✓ | ✓ |
| Mover Finalizadas | ✗ | ✓ | ✓ |

> Nota: A coluna Concluídas move automaticamente o card para Análise/Recebidos (transferindo todo o contexto).
> 

## **Tarefas** (Card Tasks)

| Função | Vendedor | Analista | Gestor |
| --- | --- | --- | --- |
| Criar tarefa em card acessível | ✓ | ✓ | ✓ |
| Atribuir tarefa | ✓ *(no próprio card)* | ✓ | ✓ |
| Concluir tarefa (assignee) | ✓ *(se assignee)* | ✓ *(se assignee)* | ✓ |
| Editar tarefa (criador/assignee) | ✓ *(se criador/assignee)* | ✓ *(se criador/assignee)* | ✓ |
| Excluir tarefa | ✗ | ✗ | ✓ |
| Geração de notificação aos envolvidos | ✗ *(automático)* | ✗ *(automático)* | ✗ *(automático)* |

## **Comentários** (Card Comments)

| Função | Vendedor | Analista | Gestor |
| --- | --- | --- | --- |
| Comentar em card acessível | ✓ | ✓ | ✓ |
| Responder (thread) | ✓ | ✓ | ✓ |
| Editar/Excluir **próprio** comentário | ✓ | ✓ | ✓ |
| Excluir comentário de terceiros | ✗ | ✗ | ✓ |
| Geração de notificação aos envolvidos | ✗ *(automático)* | ✗ *(automático)* | ✗ *(automático)* |

## **Anexos** (Card Attachments)

| Função | Vendedor | Analista | Gestor |
| --- | --- | --- | --- |
| Visualizar anexos de cards acessíveis | ✓ | ✓ | ✓ |
| Fazer upload de anexo | ✓ | ✓ | ✓ |
| Editar **próprio** anexo (metadados) | ✓ | ✓ | ✓ |
| Excluir **próprio** anexo | ✓ | ✓ | ✓ |
| Excluir anexo de terceiros | ✗ | ✗ | ✓ *(quando necessário)* |
| Editar anexos de terceiros (metadados) | ✗ | ✗ | ✓ *(quando necessário)* |

> Separação: Storage guarda o arquivo; DB guarda metadados e aplica RLS.
> 

## **Notificações** (Inbox)

| Função | Vendedor | Analista | Gestor |
| --- | --- | --- | --- |
| Ver **próprias** notificações | ✓ | ✓ | ✓ |
| Ver notificações de terceiros | ✗ | ✗ | ✓ *(Ainda não habilitado no Front)* |

### Observações gerais

- Em **Kanban Análise**, as ações de mover card são restritas a **Analista (assignee)** e **Gestor** nas colunas operacionais (Em Análise, Reanálise, Aprovados/Negados) conforme especificado no documento.
- Em **Kanban Comercial**, **Vendedor/Analista/Gestor** podem movimentar e a coluna **Concluídas** dispara o envio à Análise (**Recebidos**) com todos os dados.
- Para **Anexos**, as políticas de SELECT/INSERT para qualquer usuário autenticado e UPDATE/DELETE restritos ao **autor** estão descritas explicitamente na tabela de políticas.