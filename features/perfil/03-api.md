### Rotas e Contratos

| Rota | Método | Função | Request | Response |
| --- | --- | --- | --- | --- |
| `/api/login` | POST | Login via Supabase Auth | `{ email, password }` | `{ session }` |
| `/api/logout` | POST | Encerra sessão | — | `{ ok: true }` |
| `/api/perfil` | GET | Busca perfil | — | `{ profile }` |
| `/api/perfil` | PUT | Atualiza perfil | `{ name, email?, phone }` | `{ ok: true, updatedAt }` |