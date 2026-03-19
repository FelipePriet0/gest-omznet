# 📋 LEIS DO SISTEMA DE TOASTS

Este documento define as Leis fundamentais que regem o sistema de notificações toast do MZNET.

---

## **LEI 1 – TAMANHO FIXO**

### Regras:
1. ✅ **Todos os cards devem ter o mesmo tamanho, independente da descrição interna do mesmo**
2. ✅ Altura fixa para todos os toasts
3. ✅ Largura fixa para todos os toasts
4. ✅ O conteúdo interno pode variar, mas o card mantém dimensões constantes

### Implementação:

#### Dimensões Fixas:
```typescript
// ToastNotification.tsx
<Card className="min-h-[200px] w-full ...">
  // Conteúdo interno pode variar, mas o card mantém altura mínima
</Card>
```

#### Container Fixo:
```typescript
// ToastContainer.tsx
<div className="relative w-[380px]">
  // Largura fixa de 380px para todos os toasts
</div>
```

### Exemplo:
```
┌─────────────────┐ ← Todos têm 380px de largura
│   Toast 1       │ ← Todos têm altura mínima de 200px
│   (texto curto) │
│                 │
└─────────────────┘

┌─────────────────┐ ← Mesmo tamanho
│   Toast 2       │ ← Mesmo tamanho
│   (texto longo) │
│   ...           │
└─────────────────┘
```

---

## **LEI 2 – FUNÇÃO ESCADA (POSICIONAMENTO)**

### Regras:
1. ✅ **A borda superior do toast de trás fica 6px acima da borda superior do toast da frente**
2. ✅ Gap fixo de 6px entre as bordas superiores dos cards
3. ✅ Offset horizontal: cards de trás ficam deslocados para esquerda
4. ✅ Todos os toasts visíveis têm 100% de opacidade
5. ✅ Toast mais recente sempre na frente (ordem por recência)

### Implementação:

#### Gap Vertical (Escada):
```typescript
const GAP_TOP = 6; // Gap fixo de 6px entre bordas superiores
const verticalOffset = stackIndex * GAP_TOP;
// Toast 0: 0px (base)
// Toast 1: 6px acima
// Toast 2: 12px acima
// Toast 3: 18px acima
```

#### Offset Horizontal:
```typescript
const HORIZONTAL_OFFSET = 8; // Offset horizontal para esquerda
const horizontalOffset = stackIndex * HORIZONTAL_OFFSET;
// Cards de trás ficam deslocados para esquerda
```

#### Ordenação por Recência:
```typescript
// toasts.toReversed() garante que o mais recente fica na frente
{toasts.toReversed().map((toast, idx) => {
  const stackIndex = cardCount - (idx + 1);
  // stackIndex 0 = toast mais recente (frente)
  // stackIndex aumenta para toasts de trás
})}
```

#### Escala Decrescente:
```typescript
// Escala: 1.0 (frente) → menor atrás
"--scale": 1 - stackIndex * SCALE_FACTOR
// SCALE_FACTOR = 0.03 (3% de redução por nível)
```

#### z-index:
```typescript
// Toast mais recente (idx=0) tem z-index maior, fica por cima
zIndex: cardCount - idx
```

#### Opacidade:
```typescript
// Todos os toasts visíveis têm 100% de opacidade
opacity-100
// Apenas toasts não visíveis (stackIndex >= 6) ficam ocultos
```

### Exemplo Visual:
```
┌─────────────────┐ ← Toast 0 (mais recente): 0px offset, scale 1.0
│   Toast Maior   │
│                 │
└─────────────────┘
    ┌───────────────┐ ← Toast 1: 6px acima, 8px esquerda, scale 0.97
    │  Toast Médio  │
    │               │
    └───────────────┘
        ┌─────────────┐ ← Toast 2: 12px acima, 16px esquerda, scale 0.94
        │ Toast Menor │
        │             │
        └─────────────┘
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Lei 1 - Tamanho Fixo:
- [x] Todos os cards têm largura fixa (380px)
- [x] Todos os cards têm altura mínima fixa (200px)
- [x] Conteúdo interno pode variar
- [x] Dimensões do card permanecem constantes

### Lei 2 - Função Escada:
- [x] Gap fixo de 6px entre bordas superiores
- [x] Offset horizontal para esquerda
- [x] Opacidade 100% para todos os toasts visíveis
- [x] Efeito de escada visual correto
- [x] Parte superior dos toasts de trás visível
- [x] Toast mais recente sempre na frente
- [x] Ordenação por recência implementada
- [x] Escala decrescente implementada
- [x] z-index correto (maior na frente)

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

### Constantes:
```typescript
const GAP_TOP = 6; // Gap fixo entre bordas superiores (6px)
const HORIZONTAL_OFFSET = 8; // Offset horizontal (8px por nível)
const SCALE_FACTOR = 0.03; // Redução de escala (3% por nível)
```

### Dimensões Fixas:
```typescript
// Container: largura fixa
<div className="relative w-[380px]">

// Card: altura mínima fixa
<Card className="min-h-[200px] w-full ...">
```

### Cálculo de Posicionamento:
```typescript
// Índice na pilha: 0 = frente (mais recente), aumenta para trás
const stackIndex = cardCount - (idx + 1);

// Offset vertical: gap fixo de 6px
const verticalOffset = stackIndex * GAP_TOP;

// Offset horizontal: 8px por nível
const horizontalOffset = stackIndex * HORIZONTAL_OFFSET;

// Escala: decrescente
const scale = 1 - stackIndex * SCALE_FACTOR;
```

### Visibilidade:
- Toasts visíveis: `cardCount - idx <= 3` (máximo 3 toasts visíveis)
- Toasts ocultos: `opacity-0` até hover ou interação
- Todos os toasts visíveis: `opacity-100`

---

**Última atualização:** Implementação completa das 2 Leis dos Toasts ✅

