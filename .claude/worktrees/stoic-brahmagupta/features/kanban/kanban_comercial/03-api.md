| Endpoint | Método | Função | Request | Response |
| --- | --- | --- | --- | --- |
| `/api/cards` | GET | Lista cards do usuário / mostrar os cards do usuário logado. | — | `{ cards: [...] }` |
| `/api/cards/:id` | GET | Busca card específico / abrir um card detalhado.

Quando o usuário clica em um card do Kanban, o sistema chama essa API para trazer tudo sobre ele:
dados do cliente, tarefas, comentários, anexos, etc. | — | `{ card }` |
| `/api/cards` | POST | Cria novo card / adicionar um novo post-it na parede.

Quando o vendedor cadastra um cliente, ou cria uma nova oportunidade, essa API é chamada pra gerar o card inicial na coluna “Feitas / Cadastrar no mk” | `{ applicant_id, title }` | `{ id }` |
| `/api/cards/:id/move` | PUT | Move card de coluna / arrastar o card pra próxima etapa. | `{ column }` | `{ ok: true }` |
| `/api/cards/:id/delete` | DELETE | Remove card / deletar Caard | — | `{ ok: true }` |