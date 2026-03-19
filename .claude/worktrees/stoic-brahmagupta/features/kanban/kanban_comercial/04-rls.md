| Política | Operação | Regra SQL |
| --- | --- | --- |
| `select_own_cards` | SELECT | `kanban_cards.created_by = auth.uid() OR auth.role() = 'gestor'` |
| `insert_own_cards` | INSERT | `auth.role() = 'vendedor'` |
| `update_own_cards` | UPDATE | `kanban_cards.created_by = auth.uid() OR auth.role() = 'gestor'` |
| `view_concluidas_analyst` | SELECT | `kanban_cards.column = 'Concluídas' AND auth.role() IN ('analista','gestor')` |
| `delete_cards` | DELETE | `auth.role() = 'gestor'` |