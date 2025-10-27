**Objetivo em 1 frase:**

Gerenciar o fluxo comercial desde a prospecção até a conclusão de fichas, com triggers automáticas que encaminham cards para a etapa de Análise.

---

### ✅ Resultado esperado (DONE = verdadeiro quando…)

- [ ]  Cards são criados automaticamente após o cadastro de um applicant, pelo CTA: “Criar Ficha”, ao finalizar todo o Processo de criação da ficha (Que você verá na pasta “Cadastro/”)  criará um Card direcionado à coluna: “Feitas/Cadastrar no Mk” que ao clicar abre a “/Editar ficha”. Você verá mais para frente.
- [ ]  O vendedor consegue mover o card entre as colunas do Kanban Comercial.
- [ ]  Ao chegar em **Concluídas**, o card é enviado automaticamente para **Análise/Recebidos**.
- [ ]  Cada movimentação é registrada no log (`card_history`).
- [ ]  Permissões e RLS impedem acesso indevido a cards de outros usuários.

---

### 🚫 Filtros avançados  (Side bar superior). 
****

| Filtros | Funcionalidade | O que é:  |
| --- | --- | --- |
| Busca | Buscar o nome do titular da ficha/cadastro | Barra de busca com Placeholder: ”Buscar Titular (Nome da ficha)” |
| Setor | Segmentar o kanban por setores, podendo navegar por páginas diferentes e deixar o front organizado) | Dropdown com: 

 - Comercial → Action: Vai para aba /kanban comercial
- Analise → Action: Vai para aba /Analise Comercial |
| Responsável |  Filtrar o Colaborador responsável por aquela ficha. 

OBS: No kanban Comercial, responsável são apenas vendedores (Hookado com campo de **Vendedor (Equipe Responsável) na Aba “Editar Ficha”,**  | Dropdown com Hook em: 

- [`Public.profiles.id](http://Public.profiles.id) e public.role.id`

Todo id que a role for: “Vendedor” deve ter o public.profiles.Full_name no dropdown.  |
| **Prazo** | **Filtrar as fichas baseado no campo: “Instalação agendada para”, fazendo aparecer nas colunas do Kanban cujo filtro foi usado, apenas aqueles que estão na data e hora escolhida.**  | Dropdown com: 

- **Todos 
- Agendada para hoje 
- Agendada para amanhã 
- Atrasado 
- Escolher data 

OBS: Ao selecionar “Escolher Data” abre calendário (Biblioteca: Flatpickr) na tela para escolha da “Data”: Dia / Mês / Ano.**  |
| **Horário** | Escolher data de agendamento, baseado em: 

`- public.kanban_cards.due_at
 - public.kanban_cards.hora_at` | Dropdown com: 

- 08:30
- 10:30
- 13:30
- 15:30  |
| **Atribuidas** | Filtrar os cards que tem “Menções” ou “Tarefas” (Depende da escolha) referentes ao ID. 
 | Dropdown com: 

- Todos
- Minhas Menções
- Minhas tarefas |

---

### 🧭 Fluxo simples (passo a passo)

1️⃣ O vendedor cria um applicant (PF/PJ). Através do CTA: 

2️⃣ Um card correspondente é criado na coluna Feitas/Cadastrar no MK. 

3️⃣ O vendedor movimenta o card conforme andamento do processo. 

4️⃣ Ao chegar em **Concluídas**, uma **trigger** envia o card e todos os vínculos (applicant, anexos, comentários, tarefas) para o **Kanban Análise → Recebidos**..

---

### 🧱 Colunas do Kanban Comercial

<aside>
💡

Faremos um Kanban parecido com o Trello, onde nossas colunas são todas corridas para a direita e temos duas barras de rolagem, tanto para cima e para baixo, quanto da direita para a esquerda, possibilitando mexermos na página sem problemas com a UX para encontrar os cards seja numa coluna que tem muitos e precisa ir para baixo, ou seja para acessar uma coluna que estão fora da tela para esquerda ou direita. 

</aside>

| Coluna | Descrição | Acesso | Ação gerada |
| --- | --- | --- | --- |
| **Entrada** | Leads que vem de sistemas on-line (E-fichas / etc)  | Nenhum Auth inputa ficha nessa coluna, apenas a retira. 

Fichas movidas por arraste: se você tentar arrastar para “Entrada”, a ação é bloqueada. |  |
| Feitas/Cadastrar no MK | O que é: a coluna onde ficam as fichas recém‑criadas manualmente pelo time Comercial, prontas para o cadastro no MK (ou próximos passos do comercial). | - Vendedor, Analista e Gestor pode movimentar para dentro  fora desta coluna conforme o andamento (documentos, cancelamento ou conclusão). 

- Fichas criadas pelo botão “Criar nova ficha” (PF/PJ) após preencher os dados básicos. Passou da aba: “Dados básicos (Seja PF ou PJ) já abre o card na coluna, fazendo com que fique salvado, mesmos em preencher a ficha completa. 

 |  |
| Aguardando Documento | Etapa do processo | Vendedor / Analista / Gestor podem movimentar para detro ou fora desta coluna conforme o andamento. 

**Funcionalidades futuras para essa coluna:**
• Funcionalidades futuras:  Etiquetas com nome dos documentos (RG / CNH / Comprovante End). |  |
| Canceladas | Coluna onde ficam as fichas encerradas por desistência, erro definitivo ou inviabilidade
comprovada.  | Vendedor / Analista / Gestor podem  movimentar, apenas para dentro, desta coluna conforme o andamento  e quem movimenta precisa informar um motivo (obrigatório). O sistema registra quem cancelou e quando. 
 | Ao mover qualquer card para essa coluna, abre: Modal: “Cancelar Ficha”:

• Quando você arrasta uma ficha para a coluna “Canceladas”, o sistema abre um modal pedindo o motivo do cancelamento.

    ◦ O motivo é obrigatório. Sem motivo, a ficha não é cancelada.

Estrutura do Modal: 

Estrutura do Modal
• Título: “Cancelar ficha”
• Subtítulo: “Informe o motivo do cancelamento. Esta ação será registrada para análise.”
• Campo “Motivo” (obrigatório):

    ◦ Campo de texto curto (uma frase direta).
    ◦ Placeholder: “Ex: Cliente desistiu / Dados inconsistentes”
<aside>
💡
• Rodapé (botões/CTAs):

    ◦ “Cancelar” (cinza): fecha o modal sem fazer nada; a ficha permanece como estava.
    ◦ “Confirmar” (verde): confirma o cancelamento, move a ficha para “Canceladas” e salva o motivo.
</aside>

Regras e Comportamento
• Motivo obrigatório: se o campo estiver vazio, aparece um aviso e o cancelamento não segue.
• Registro (auditoria): o sistema grava quem cancelou, quando e qual motivo foi informado.
• Efeito no Kanban: ao confirmar, a ficha vai para “Canceladas”. A lista atualiza automaticamente.
• Sem “apagar”: cancelar não apaga a ficha; ela fica registrada no histórico para consultas futuras. |
| **Concluídas** | Cards finalizados → Trigger para Análise.  | Vendedor / Analista / Gestor podem  mover para “Concluídas” quando todos os passos foram realizados com sucesso (ex.:cadastro no MK feito, documentos ok, contrato registrado). | Resumo: “Concluídas” é o ponto final do fluxo Comercial. Use quando a ficha está realmente fechada com sucesso
— sem pendências — e registre uma nota rápida se necessário.

**Trigger de envio: Concluidas (Kanban Comercial) → Recebido (Kanban Análise)**

💡
• O que é: é o mecanismo que tira a ficha do fluxo Comercial e a coloca no fluxo de Análise na coluna: Recebidos
• Quando esse mecanismo é ativado: Sempre que um Card é movimentado para dentro da coluna Concluídas.
• O que vai junto: TUDO, todas as informações, dados, status, parecer, observação, tudo vai junto
 |

OBS: As colunas são organizadas lado a lado com Scrolls: verflow-x-auto, overflow-y-visible. Sendo: 

**Entrada | Feitas/Cadastrar no MK | Aguardando Documento | Canceladas | Concluidos 

Scrolls: 
 V                                                                                                                        ^
←→ (Direita e esquerda, localizado no canto inferior da página + |  (Para cima e para baixo)** 
 

---

### Estrutura do Sidebar e das colunas.

```tsx
HEADER COM FILTROS - ESTRUTURA DETALHADA
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          HEADER COM FILTROS                                    │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │              Gradiente Verde (from-[#018942] to-[#014d28])                     │ │
│ │ ┌─────────────────────────────────────────────────────────────────────────┐    
│ │ │                         Filtros em Grid                                    │ │
│ │ │                                                                               
│ │ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────┐ │ │
│ │ │ │   🔍 Search │ │    📍 Área  │ │   👤 Resp.  │ │   📅 Prazo  │ │ 🎯 Atribuuidas│    
│ │ │ │ [Input]     │ │ [Select]    │ │ [Dropdown]  │ │ [Select]    │ │ [Select]│        
│ │ │ │________________________________________________________________________           
│ │ │ ┌─────────────────────────────────────────────────────────────────────┐     
│ │ │ │                    CTA: NOVA FICHA                                 │ │      
│ │ │ │                                ________________________________                                     
│ │ │ │                               │     [➕ Nova ficha]            │   │          
│ │ │ │                               │                                 │                        
│ │ │ │                               │  hover-scale animation         │   │ 
│ │ │ │                               └─────────────────────────────────┘   │
│ │ │ └─────────────────────────────────────────────────────────────────────┘ 

```

```tsx
🎯 COLUNAS DO KANBAN COMERCIAL - ESTRUTURA DETALHADA
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          KANBAN COMERCIAL                                      │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                    Sistema de Rolagem Horizontal                           │ │
│ │                                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │  🔄 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100    │ │ │
│ │ │                                                                         │ │ │
│ │ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────┐ │ │ │
│ │ │ │   ENTRADA   │ │   FEITAS    │ │ AGUARDANDO  │ │ CANCELADAS  │ │CONCL│ │ │ │
│ │ │ │             │ │             │ │             │ │             │ │UÍDAS│ │ │ │
│ │ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │     │ │ │ │
│ │ │ │ │🔵 Coluna│ │ │ │🟢 Coluna│ │ │ │🟡 Coluna│ │ │ │🔴 Coluna│ │ │🟣   │ │ │ │
│ │ │ │ │Header   │ │ │ │Header   │ │ │ │Header   │ │ │ │Header   │ │ │     │ │ │ │
│ │ │ │ │         │ │ │ │         │ │ │ │         │ │ │ │         │ │ │     │ │ │ │
│ │ │ │ │• Título │ │ │ │• Título │ │ │ │• Título │ │ │ │• Título │ │ │•    │ │ │ │
│ │ │ │ │• Badge  │ │ │ │• Badge  │ │ │ │• Badge  │ │ │ │• Badge  │ │ │     │ │ │ │
│ │ │ │ │  Count  │ │ │ │  Count  │ │ │ │  Count  │ │ │ │  Count  │ │ │     │ │ │ │
│ │ │ │ └─────────┘ │ │ │ └─────────┘ │ │ │ └─────────┘ │ │ │ └─────────┘ │ │     │ │ │ │
│ │ │ │             │ │ │             │ │ │             │ │ │             │ │     │ │ │ │
│ │ │ │ ┌─────────┐ │ │ │ ┌─────────┐ │ │ │ ┌─────────┐ │ │ │ ┌─────────┐ │ │ ┌─┐ │ │ │ │
│ │ │ │ │  Cards  │ │ │ │ │  Cards  │ │ │ │ │  Cards  │ │ │ │ │  Cards  │ │ │ │ │ │ │ │ │
│ │ │ │ │  Area   │ │ │ │ │  Area   │ │ │ │ │  Area   │ │ │ │ │  Area   │ │ │ │ │ │ │ │ │
│ │ │ │ │         │ │ │ │ │         │ │ │ │ │         │ │ │ │ │         │ │ │ │ │ │ │ │ │
│ │ │ │ │• Drag   │ │ │ │ │• Drag   │ │ │ │ │• Drag   │ │ │ │ │• Drag   │ │ │ │ │ │ │ │ │
│ │ │ │ │  & Drop │ │ │ │ │  & Drop │ │ │ │ │  & Drop │ │ │ │ │  & Drop │ │ │ │ │ │ │ │ │
│ │ │ │ │         │ │ │ │ │         │ │ │ │ │         │ │ │ │ │         │ │ │ │ │ │ │ │ │
│ │ │ │ │• Sortable│ │ │ │ │• Sortable│ │ │ │ │• Sortable│ │ │ │ │• Sortable│ │ │ │ │ │ │ │ │
│ │ │ │ │  Context │ │ │ │ │  Context │ │ │ │ │  Context │ │ │ │ │  Context │ │ │ │ │ │ │ │ │
│ │ │ │ │         │ │ │ │ │         │ │ │ │ │         │ │ │ │ │         │ │ │ │ │ │ │ │ │
│ │ │ │ │• Cards  │ │ │ │ │• Cards  │ │ │ │ │• Cards  │ │ │ │ │• Cards  │ │ │ │ │ │ │ │ │
│ │ │ │ │  List   │ │ │ │ │  List   │ │ │ │ │  List   │ │ │ │ │  List   │ │ │ │ │ │ │ │ │
│ │ │ │ └─────────┘ │ │ │ └─────────┘ │ │ │ └─────────┘ │ │ │ └─────────┘ │ │ └─┘ │ │ │ │
│ │ │ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │ └─────┘ │ │ │
│ │ │                                                                         │ │ │
│ │ │  📊 Dimensões: 340px width, min-height 200px, gap-6                    │ │ │
│ │ │  🎨 Design: rounded-2xl, shadow-sm, hover:shadow-md                    │ │ │
│ │ │  🔄 Scroll: overflow-x-auto, overflow-y-visible                        │ │ │
│ │ └─────────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### ⚙️ Tabelas e Triggers Envolvidas

- `kanban_cards` → metadados do card (status, coluna, responsável).
- `applicants` → dados do cliente vinculado.
- `card_comments` → comentários dentro do card.
- `card_tasks` → tarefas do vendedor.
- `card_attachments` → documentos anexados.
- `card_history` → registros de movimentação.
- **Trigger:** `fn_trigger_move_to_analysis` → aciona quando `column = 'Concluídas'`.

---

### 🔐 Permissões (RLS)

| Auth | Pode fazer | Restrição |
| --- | --- | --- |
| **Vendedor** | - Criaa Fichas (Aplicants) 
- Mover  e Edita cards **próprios** | `kanban_cards.created_by = auth.uid()` |
| **Analista** | - Criaa Fichas (Aplicants) 
- Mover  e Edita cards **próprios** | `kanban_cards.column = 'Concluídas'` |
| **Gestor** | - Criaa Fichas (Aplicants) 
- Mover e Edita cards **próprios** | Sem restrição |