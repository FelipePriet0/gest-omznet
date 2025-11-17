# 📋 LEIS DO SISTEMA DE THREADS

Este documento define as 3 Leis fundamentais que regem o sistema de threads (conversas co-relacionadas) do MZNET.

---

## **LEI 1 – HIERARQUIA**

### Regras:
1. ✅ Toda resposta tem um `parent_id` válido
2. ✅ Toda sub-resposta aponta pra uma resposta ou pai
3. ✅ Não pode existir "comentário órfão" seja ela: Texto, Tarefa, Anexo, Menção

### Implementação:

#### Validação Preventiva:
- ✅ `addComment()` valida `parent_id` antes de criar comentário
- ✅ `uploadAttachmentBatch()` valida `comment_id` antes de criar anexo
- ✅ `TaskDrawer` valida `comment_id` antes de criar tarefa

#### Filtragem Automática:
- ✅ `buildTree()` filtra automaticamente comentários órfãos
- ✅ Anexos e tarefas são filtrados por `comment_id` válido

### Exemplo:
```typescript
// ✅ CORRETO
Thread Pai (id: "1", parent_id: null)
  └─ Resposta (id: "2", parent_id: "1") ← parent_id válido

// ❌ ERRADO (prevenido)
Resposta Órfã (id: "2", parent_id: "999") ← "999" não existe!
// Erro: "Comentário pai não encontrado ou foi deletado"
```

---

## **LEI 2 – CONTEÚDO**

### Regras:
1. ✅ Texto, Tarefa, Anexo, Menção passam pelo mesmo fluxo: **criar → listar → responder**
2. ✅ O tipo de conteúdo **não muda QUEM pode mexer**, só o **QUE é mostrado**
3. ✅ Permissões são baseadas em RLS (Row Level Security), não no tipo

### Implementação:

#### Fluxo Unificado de Criação:
```typescript
// Todos usam a mesma estrutura
- Texto: addComment(cardId, text, parentId)
- Tarefa: TaskDrawer → cria comentário → cria tarefa com comment_id
- Anexo: uploadAttachmentBatch({ cardId, commentId, files })
- Menção: addComment(cardId, "texto @usuario", parentId)
```

#### Fluxo Unificado de Listagem:
```typescript
// Todos aparecem na mesma árvore hierárquica
listComments(cardId) → buildTree() → renderiza tudo junto
```

#### Fluxo Unificado de Resposta:
```typescript
// Todos usam a mesma função
onReply={(parentId, value) => submitComment(parentId, value)}
```

#### Permissões (RLS - Backend):
```sql
-- Mesmas permissões para TODOS os tipos:
- Criar: vendedor, analista, gestor ✅
- Editar: autor OU gestor ✅
- Excluir: autor OU gestor ✅
```

### Exemplo:
```typescript
// Mesmo fluxo, diferentes renderizações:
<CommentItem
  node={texto}           // ← Texto
  tasks={[...]}          // ← Tarefas (mesmo componente)
  attachments={[...]}    // ← Anexos (mesmo componente)
/>
```

---

## **LEI 3 – ORDEM E UX**

### Regras:
1. ✅ Threads pai aparecem em ordem cronológica (ou pela regra definida)
2. ✅ Respostas grudadas no pai
3. ✅ Sub-respostas grudadas na resposta

### Implementação:

#### Ordenação Cronológica:
```typescript
// listComments() ordena por created_at ASC
.order("created_at", { ascending: true })

// buildTree() mantém ordem e ordena recursivamente
const sortFn = (a, b) => new Date(a.created_at) - new Date(b.created_at);
sortTree(roots); // Ordena todos os níveis
```

#### Agrupamento Hierárquico:
```typescript
// Respostas vão para dentro do pai
if (n.parent_id && byId.has(n.parent_id)) {
  byId.get(n.parent_id).children.push(node); // ← Grudado no pai
}
```

#### Renderização Visual:
```typescript
// depth aumenta recursivamente
Thread Pai: depth={0}      // Sem indentação
Resposta: depth={1}        // Indentado (ml-6)
Sub-resposta: depth={2}    // Mais indentado
```

### Exemplo:
```
10:00 - Thread Pai (Texto) ← Ordem cronológica
  ├─ 10:01 - Resposta (Anexo) ← Grudada no pai
  │   └─ 10:02 - Sub-resposta (Texto) ← Grudada na resposta
  └─ 10:03 - Resposta (Tarefa) ← Grudada no pai, ordenada

10:05 - Thread Pai (Anexo) ← Ordem cronológica (depois)
  └─ 10:06 - Resposta (Texto) ← Grudada no pai
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Lei 1 - Hierarquia:
- [x] Validação preventiva em `addComment()`
- [x] Validação preventiva em `uploadAttachmentBatch()`
- [x] Validação preventiva em `TaskDrawer`
- [x] Filtragem automática em `buildTree()`
- [x] Anexos filtrados por `comment_id`
- [x] Tarefas filtradas por `comment_id`

### Lei 2 - Conteúdo:
- [x] Fluxo unificado de criação
- [x] Fluxo unificado de listagem
- [x] Fluxo unificado de resposta
- [x] Permissões independentes do tipo (RLS)
- [x] Renderização diferenciada por tipo

### Lei 3 - Ordem e UX:
- [x] Ordenação cronológica (created_at ASC)
- [x] Respostas agrupadas no pai
- [x] Sub-respostas agrupadas recursivamente
- [x] Ordenação mantida em todos os níveis
- [x] Hierarquia visual preservada (depth)

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

### Validações Preventivas:
As validações da Lei 1 são feitas **antes** de criar o registro, prevenindo órfãos desde a origem.

### Filtragem Automática:
Mesmo que um órfão exista (ex: pai deletado depois), `buildTree()` filtra automaticamente na renderização.

### Ordenação:
Por padrão, ordem é **cronológica crescente** (mais antigo primeiro). Se precisar mudar, alterar `sortFn` em `buildTree()`.

### Permissões:
Todas as permissões são gerenciadas pelo backend via RLS. O frontend apenas segue as regras definidas.

---

**Última atualização:** Implementação completa das 3 Leis ✅

