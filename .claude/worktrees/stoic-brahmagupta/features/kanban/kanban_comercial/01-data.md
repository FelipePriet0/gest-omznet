### Tabela: `kanban_cards`

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