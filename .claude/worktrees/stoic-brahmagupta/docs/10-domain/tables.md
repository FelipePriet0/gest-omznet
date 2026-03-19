## 🧩 Mapeamento das Tabelas — Sistema Interno MZNET

> Documento criado a partir do arquivo “Mapeamento Completo das Tabelas do Sistema MZNET”.
> 
> 
> Contém a descrição resumida de **cada tabela**, suas **principais colunas**, **relações (FKs)** e **finalidade funcional**.
> 

---

### 👥 PROFILES

**Finalidade:** Armazenar informações dos colaboradores (usuários internos).

**Relacionamento:** Nenhuma FK (tabela base de usuários).

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid | ID único do usuário (`auth.users.id`). |
| `full_name` | text | Nome completo do colaborador. |
| `role` | enum | Função no sistema (vendedor, analista, gestor). |
| `created_at` / `updated_at` | timestamptz | Datas de criação e atualização. |

---

### 👤 APPLICANTS

**Finalidade:** Armazena dados em comuns de clientes (PF e PJ).

**Relacionamento:** Tabela base das fichas PF e PJ.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid | ID único do cliente. |
| `person_type` | enum | PF ou PJ. |
| `primary_name` | text | Nome / Razão social. |
| `cpf_cnpj` | text | CPF ou CNPJ. |
| `phone`  | text | Contatos principais. |
| whatsapp | text | Whatsapp do cliente |
| `email` | text | E-mail do cliente |
| **address_line** | text | Endereço (Rua) do cadastro |
| **address_number** | text | Nº da casa ou Estabelecimento |
| bairro | text | Bairro da casa ou Estabelecimento |
| **cep** | text | CEP da casa ou estabelecimento |
| **address_complement** | text | Complemento da casa ou estabelecimento |
| **plano_acesso** | text | Plano (Velocidade) de internet escolhida |
| **venc** | text | Venc da mensalidade |
| **carne_impresso** | Boolean | Se cliente quer carnê impresso ou Não (True = Sim / False = Não) |
| **sva_avulso** | text | Serviços avuslos  |
| **quem_solicitou** | text | Nome de quem pediu/solicitou a instalação |
| **telefone_solicitante** | text | tel de quem pediu/solicitou a instalação |
| **protocolo_mk** | text | Protocolo do sistema |
| **meio** | text | Meio por qual foi solicitado |
| **info_spc** | text | Informação do SPC |
| **info_pesquisador** | text | Informação do pesquisador |
| **info_relevantes** | text | Inf relevante do pedido |
| **info_mk** | text | Informações retiradas do ERP (MK) |
| **parecer_analise** | text | Parecer / Decisão da análise |
| `created_at` / `updated_at` | timestamptz | Datas de criação e atualização. |

### 📄 PF_FICHAS

**Finalidade:** Detalhes de cadastro de pessoa física (Expanded Ficha PF).

**Relacionamento:** `public.pf_fichas.applicant_id → public.applicants.id`. 

| Nome da Coluna | Tipo  | Descrição |
| --- | --- | --- |
| id | uuid | ID único da ficha PF |
| applicant_id | uuid | ID do cliente (FK para applicants) |
| birth_date | date | Data de nascimento do cliente |
| naturalidade | text | Cidade de nascimento do cliente |
| uf_naturalidade | text | Estado de nascimento do cliente |
| do_ps | text | Informações do PS (Ponto de Serviço) |
| cond | text | Condomínio onde reside |
| tempo_endereco | text | Tempo que mora no endereço atual |
| tipo_moradia | text | Tipo de moradia (própria, alugada, etc.) |
| tipo_moradia_obs | text | Observações sobre o tipo de moradia |
| endereco_do_ps | text | Endereço do PS (Ponto de Serviço) |
| unica_no_lote | text | Se é única no lote |
| unica_no_lote_obs | text | Observações sobre ser única no lote |
| com_quem_reside | text | Com quem reside (sozinho, família, etc.) |
| nas_outras | text | Informações sobre outras residências |
| tem_contrato | text | Se possui contrato de aluguel |
| enviou_contrato | text | Se enviou contrato de aluguel |
| nome_de | text | Nome de quem está no contrato |
| enviou_comprovante | text | Se enviou comprovante (Sim/Não) |
| tipo_comprovante | text | Tipo de comprovante (Energia, Água, etc.) |
| nome_comprovante | text | Nome do comprovante enviado |
| nome_locador | text | Nome do locador/proprietário |
| telefone_locador | text | Telefone do locador/proprietário |
| tem_internet_fixa | text | Se possui internet fixa (Sim/Não) |
| empresa_internet | text | Empresa de internet atual |
| plano_internet | text | Plano de internet atual |
| valor_internet | text | Valor pago pela internet atual |
| observacoes | text | Observações gerais da ficha |
| profissao | text | Profissão do cliente |
| empresa | text | Empresa onde trabalha |
| vinculo | text | Tipo de vínculo empregatício |
| vinculo_obs | text | Observações sobre o vínculo |
| emprego_do_ps | text | Informações de emprego do PS |
| estado_civil | text | Estado civil do cliente |
| conjuge_obs | text | Observações sobre o cônjuge |
| conjuge_nome | text | Nome completo do cônjuge |
| conjuge_telefone | text | Telefone do cônjuge |
| conjuge_whatsapp | text | WhatsApp do cônjuge |
| conjuge_cpf | text | CPF do cônjuge |
| conjuge_naturalidade | text | Naturalidade do cônjuge |
| conjuge_uf | text | Estado de nascimento do cônjuge |
| conjuge_idade | integer | Idade do cônjuge |
| conjuge_do_ps | text | Informações do cônjuge do PS |
| pai_nome | text | Nome completo do pai |
| pai_reside | text | Se o pai reside com o cliente |
| pai_telefone | text | Telefone do pai |
| mae_nome | text | Nome completo da mãe |
| mae_reside | text | Se a mãe reside com o cliente |
| mae_telefone | text | Telefone da mãe |
| ref1_nome | text | Nome da primeira referência pessoal |
| ref1_parentesco | text | Parentesco da primeira referência |
| ref1_reside | text | Se a primeira referência reside com o cliente |
| ref1_telefone | text | Telefone da primeira referência |
| ref2_nome | text | Nome da segunda referência pessoal |
| ref2_parentesco | text | Parentesco da segunda referência |
| ref2_reside | text | Se a segunda referência reside com o cliente |
| ref2_telefone | text | Telefone da segunda referência |
| created_at | timestamp with time zone | Data e hora de criação do registro |
| updated_at | timestamp with time zone | Data e hora da última atualização do registro |

### 📄 PF_FICHAS

**Finalidade:** Detalhes de cadastro de pessoa física (Expanded Ficha PF).

**Relacionamento:**  `public.pj_fichas.applicant_id → public.applicants.id`.

| Nome da Coluna | Tipo de Dados | Descrição |
| --- | --- | --- |
| id | uuid | ID único da ficha PJ |
| applicant_id | uuid | ID do cliente (FK para applicants) |
| data_abertura | text | Data de abertura da empresa |
| nome_fantasia | text | Nome fantasia da empresa |
| nome_fachada | text | Nome que aparece na fachada |
| area_atuacao | text | Área de atuação da empresa |
| tipo_imovel | text | Tipo do imóvel (comercial, residencial, etc.) |
| obs_tipo_imovel | text | Observações sobre o tipo de imóvel |
| tempo_endereco | text | Tempo no endereço atual |
| tipo_estabelecimento | text | Tipo do estabelecimento |
| obs_estabelecimento | text | Observações sobre o estabelecimento |
| end_ps | text | Endereço do PS (Ponto de Serviço) |
| fones_ps | text | Telefones do PS |
| enviou_comprovante | text | Se enviou comprovante (Sim/Não) |
| tipo_comprovante | text | Tipo de comprovante (Energia, Água, etc.) |
| nome_comprovante | text | Nome do comprovante enviado |
| possui_internet | text | Se possui internet (Sim/Não) |
| operadora_internet | text | Operadora de internet atual |
| plano_internet | text | Plano de internet atual |
| valor_internet | text | Valor pago pela internet atual |
| contrato_social | text | Se possui contrato social (Sim/Não) |
| obs_contrato_social | text | Observações sobre o contrato social |
| socio1_nome | text | Nome completo do primeiro sócio |
| socio1_cpf | text | CPF do primeiro sócio |
| socio1_telefone | text | Telefone do primeiro sócio |
| socio2_nome | text | Nome completo do segundo sócio |
| socio2_cpf | text | CPF do segundo sócio |
| socio2_telefone | text | Telefone do segundo sócio |
| socio3_nome | text | Nome completo do terceiro sócio |
| socio3_cpf | text | CPF do terceiro sócio |
| socio3_telefone | text | Telefone do terceiro sócio |
| created_at | timestamp with time zone | Data e hora de criação do registro |
| updated_at | timestamp with time zone | Data e hora da última atualização do registro |
| deleted_at | timestamp with time zone | Data e hora da exclusão (soft delete) |
| deleted_by | uuid | ID do usuário que deletou o registro |
| deletion_reason | text | Motivo da exclusão do registro |

### 🗂️ KANBAN_CARDS

**Finalidade:** Cards do sistema Kanban (controle de fluxo de análise).

**Relacionamentos:**

- `public.kanban_cards.applicant_id → public.applicants.id`
- `assignee_id → profiles.id`

| Nome da Coluna | Tipo de Dados | Descrição |
| --- | --- | --- |
| id | uuid | ID único do card do Kanban |
| applicant_id | uuid | ID do cliente (FK para applicants) |
| person_type | USER-DEFINED | Tipo de pessoa (PF ou PJ) |
| area | kanban-area | Área do card (comercial, analise) |
| stage | text | Estágio atual do card (entrada, em_analise, aprovado, etc.) |
| assignee_id | uuid | ID do usuário responsável pelo card |
| received_at | timestamp with time zone | Data e hora de recebimento do card |
| due_at | timestamp with time zone | Data e hora do prazo do card |
| created_at | timestamp with time zone | Data e hora de criação do registro |
| updated_at | timestamp with time zone | Data e hora da última atualização do registro |
| reanalysis_notes | jsonb | Notas da reanálise do card |
| deleted_at | timestamp with time zone | Data e hora da exclusão (soft delete) |
| deleted_by | uuid | ID do usuário que deletou o registro |
| deletion_reason | text | Motivo da exclusão do registro |
| cancel_reason | text | Motivo do cancelamento do card |
| cancelled_at | timestamp with time zone | Data e hora do cancelamento |
| cancelled_by | uuid | ID do usuário que cancelou o card |
| created_by | uuid | ID do usuário que criou o card |
| comments | text | Comentários gerais do card |

### 📎 CARD_ATTACHMENTS

**Finalidade:** Sistema de anexos (arquivos vinculados aos cards).

**Relacionamentos:**

- `public.card_attachments.card_id → public.kanban_cards.id`
- `public.card_attachments.applicant_id → public.applicants.id`
- `public.card_attachments.uploaded_by → public.profiles.id`

| Nome da Coluna | Tipo de Dados | Descrição |
| --- | --- | --- |
| id | uuid | ID único do anexo |
| card_id | uuid | ID do card do Kanban (FK para kanban_cards) |
| author_id | uuid | ID do usuário que fez o upload |
| author_name | text | Nome do usuário que fez o upload |
| author_role | text | Função do usuário que fez o upload |
| file_name | text | Nome original do arquivo |
| file_path | text | Caminho do arquivo no storage |
| file_size | bigint | Tamanho do arquivo em bytes |
| file_type | text | Tipo MIME do arquivo |
| file_extension | text | Extensão do arquivo |
| description | text | Descrição do anexo |
| comment_id | uuid | ID do comentário relacionado (se aplicável) |
| created_at | timestamp with time zone | Data e hora de criação do registro |
| updated_at | timestamp with time zone | Data e hora da última atualização do registro |
| deleted_at | timestamp with time zone | Data e hora da exclusão (soft delete) |
| deleted_by | uuid | ID do usuário que deletou o anexo |
| applicant_id | uuid | ID do cliente relacionado (FK para applicants) |

## 💬 CARD_COMMENTS

**Função:** Sistema de comentários (conversas encadeadas nos cards).

🔗 **Relações:**

- `public.card_comments.card_id → public.kanban_cards.id`
- `public.card_comments.parent_id → public.card_comments.id`
- `public.card_comments.author_id → public.profiles.id`

📌 **Observações:**

- Suporta threads infinitas (respostas dentro de respostas).
- Cada comentário gera notificação (`inbox_notifications`) para o autor do card e usuários envolvidos.
- Exclusões são registradas em `deletion_log`.

| Nome da Coluna | Tipo de Dados | Descrição |
| --- | --- | --- |
| id | uuid | ID único do comentário |
| card_id | uuid | ID do card do Kanban (FK para kanban_cards) |
| parent_id | uuid | ID do comentário pai (para respostas encadeadas) |
| author_id | uuid | ID do usuário que escreveu o comentário |
| author_name | text | Nome do usuário que escreveu o comentário |
| author_role | text | Função do usuário que escreveu o comentário |
| content | text | Conteúdo do comentário |
| level | integer | Nível hierárquico do comentário (0, 1, 2) |
| created_at | timestamp with time zone | Data e hora de criação do comentário |
| updated_at | timestamp with time zone | Data e hora da última atualização do comentário |
| thread_id | text | ID da thread/conversa (para agrupar comentários) |
| is_thread_starter | boolean | Se é o comentário inicial da thread |
| deleted_at | timestamp with time zone | Data e hora da exclusão (soft delete) |
| deleted_by | uuid | ID do usuário que deletou o comentário |
| applicant_id | uuid | ID do cliente relacionado (FK para applicants) |

## ✅ CARD_TASKS

**Função:** Sistema de tarefas vinculadas aos cards.

🔗 **Relações:**

- `public.card_tasks.card_id → public.kanban_cards.id`
- `public.card_tasks.assigned_to → public.profiles.id`
- `public.card_tasks.created_by → public.profiles.id`
- `public.card_tasks.applicant_id → public.applicants.id`

📌 **Observações:**

- As tarefas aparecem na aba “Minhas Tarefas” de cada colaborador.
- O status é atualizado automaticamente quando marcada como concluída.
- Gera notificações (`inbox_notifications`) ao ser atribuída ou concluída.

| Nome da Coluna | Tipo de Dados | Descrição |
| --- | --- | --- |
| id | uuid | ID único da tarefa |
| card_id | uuid | ID do card do Kanban (FK para kanban_cards.id) |
| created_by | uuid | ID do usuário que criou a tarefa |
| assigned_to | uuid | ID do usuário responsável pela tarefa |
| description | text | Descrição da tarefa |
| status | text | Status atual da tarefa (pendente OU concluida). 
Checkbox: 
Marcado = Completa
Desmarcado = Pendente |
| deadline | timestamp with time zone | Data e hora do prazo da tarefa |
| comment_id | uuid | ID do comentário relacionado (se aplicável) |
| created_at | timestamp with time zone | Data e hora de criação da tarefa |
| updated_at | timestamp with time zone | Data e hora da última atualização da tarefa |
| completed_at | timestamp with time zone | Data e hora de conclusão da tarefa |
| deleted_at | timestamp with time zone | Data e hora da exclusão (Hard delete) |
| deleted_by | uuid | ID do usuário que deletou a tarefa |
| applicant_id | uuid | ID do cliente relacionado (FK para applicants.id) |

## 🗑 DELETION_LOG

**Função:** Registro histórico de exclusões (auditoria completa).

🔗 **Relações:**

- `deleted_by → profiles.id`

📌 **Observações:**

- Implementa soft delete e auditoria completa.
- Garante rastreabilidade e permite reversões futuras.
- Alimenta relatórios de conformidade e logs internos.

↩️Funcionalidades com Soft Delete: 

| Nome da Coluna | Tipo de Dados | Descrição |
| --- | --- | --- |
| id | uuid | ID único do log de exclusão |
| table_name | text | Nome da tabela onde o registro foi deletado |
| record_id | uuid | ID do registro que foi deletado |
| deleted_by | uuid | ID do usuário que deletou o registro |
| deleted_at | timestamp with time zone | Data e hora da exclusão |
| record_snapshot | jsonb | Snapshot completo dos dados antes da exclusão |
| reason | text | Motivo da exclusão do registro |

## 🔔 INBOX_NOTIFICATIONS

**Função:** Central de notificações internas para usuários (alertas automáticos).

🔗 **Relações:**

- `public.inbox_notifications.user_id → public.profiles.id`
- `public.inbox_notifications.task_id → public.card_tasks.id`
- `public.inbox_notifications.card_id → public.kanban_cards.id`
- `public.inbox_notifications.comment_id → public.card_comments.id`
- `public.inbox_notifications.applicant_id → public.applicants.id`

📌 **Observações:**

- Alimenta o painel de notificações (“sininho” no app).
- Cada interação relevante (tarefa, comentário, movimentação de card) gera uma entrada aqui.
- Futuramente integrável a e-mail ou push notifications.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| id | uuid | ID da notificação |
| user_id | uuid | FK → `profiles.id` (destinatário) |
| type | enum | Tipo de notificação (`task`, `comment`, `card`, `system`) |
| priority | enum | Prioridade (`low`, `medium`, `high`) |
| title | text | Título do alerta |
| body | text | Corpo da mensagem |
| meta | jsonb | Metadados (IDs e contexto do evento) |
| task_id | uuid | FK → `card_tasks.id` |
| card_id | uuid | FK → `kanban_cards.id` |
| comment_id | uuid | FK → `card_comments.id` |
| link_url | text | Link para abrir o item diretamente |
| transient | boolean | Se é temporária (ex: pop-up rápido) |
| expires_at | timestamptz | Data de expiração |
| read_at | timestamptz | Data de leitura |
| created_at | timestamptz | Data de criação |
| **updated_at** | timestamptz |  |
| applicant_id | uuid | FK → `applicants.id` |