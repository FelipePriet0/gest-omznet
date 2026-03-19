### Tabela: `profiles`

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| id | uuid | FK → `auth.users.id` |
| name | text | Nome completo do colaborador (Preenche na aba de perfil, dentro do Software, cuja mesma, tem hook com essa coluna `(Profiles.full_name)` em realtime. |
| email | text | Email (reflete auth) |
| phone | text | Telefone |
| role | enum | (`vendedor`, `analista`, `gestor`) |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última atualização |

**Integridade:**

- `email` único.
- `role` Admin determina dentro do Supabase. Após isso, fixo via trigger de sincronização com Auth metadata.