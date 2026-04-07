# Builder e Agenda — Como Funciona o Processo

> **Perspectiva:** Como um COO explicaria ao CEO o que acontece nos bastidores da operação de agendamento de instalações.

---

## A Ideia Central

Imagine que a empresa tem uma equipe de técnicos de campo que precisa ser escalada diariamente para atender clientes em diferentes bairros. O sistema tem duas "salas" para isso:

- **O Builder** → onde se definem as **regras do jogo** (quem pode atender quem, e em que ordem de prioridade)
- **A Agenda** → onde o time operacional **executa o jogo** no dia a dia

São ferramentas separadas, mas totalmente conectadas. Uma alimenta a outra.

---

## O Builder — A Sala de Regras

O Builder é onde a gestão configura a lógica de distribuição de trabalho. É usado esporadicamente — sempre que as regras de atendimento mudam.

### O que se faz aqui:

**1. Cadastrar os técnicos**
Antes de qualquer coisa, os técnicos que fazem atendimento de campo são cadastrados aqui. Para cada técnico, define-se:
- Nome
- Tipo de atividade que ele executa
- Período de disponibilidade (datas de início e fim de atuação)

Se um técnico sai de férias, é afastado ou muda de função, isso é atualizado aqui. O sistema para de escalá-lo automaticamente.

**2. Montar as regras de distribuição (o Workflow)**
Aqui é onde a inteligência do processo é desenhada. A gestão responde visualmente a três perguntas:

- **Quais técnicos** vão trabalhar neste fluxo?
- **Que tipo de instalação** cada grupo de técnicos atende? (ex: instalação nova, migração, upgrade)
- **Quais bairros** cada grupo cobre?

Essas três informações são conectadas entre si formando uma espécie de mapa de decisão. O resultado é: "Para um cliente do Bairro X que precisa de uma Instalação do Tipo Y, o técnico mais indicado é o Z."

**3. Publicar o Workflow**
Quando as regras estão prontas e revisadas, o gestor clica em **Publicar**. A partir desse momento, a Agenda passa a usar essas regras. É como aprovar e distribuir um novo manual de operações para a equipe.

> **Analogia para o CEO:** O Builder é como o RH e a área de operações definindo o organograma de campo, as regiões de cobertura e as competências de cada equipe. Quando aprovado, vira a referência oficial para o agendamento.

---

## A Agenda — A Sala de Operação Diária

A Agenda é usada pelo time operacional todos os dias. É onde os atendimentos são organizados, distribuídos e acompanhados.

### O que se vê na tela:

Uma grade com dois eixos:
- **Linhas:** Cada técnico disponível naquele dia
- **Colunas:** Os horários disponíveis (manhã cedo, manhã tarde, tarde cedo, tarde)

Cada cliente que precisa de atendimento aparece como um "cartão" nessa grade. O objetivo do dia é garantir que todo cartão esteja alocado a um técnico e horário.

### O que o time faz aqui:

**Alocar um atendimento**
O operador arrasta o cartão do cliente para a linha do técnico e o horário desejado. O sistema automaticamente:
- Verifica se o técnico já tem outro atendimento naquele horário (evita conflito)
- Verifica se o técnico está habilitado para aquele tipo de serviço
- Sugere o melhor técnico com base nas regras configuradas no Builder

**Reagendar**
Se um cliente precisar mudar de horário, o operador arrasta o cartão para outro slot. Simples assim.

**Linhas livres**
Além das linhas dos técnicos, existem "linhas livres" — espaços temporários para atendimentos que ainda não foram designados a nenhum técnico. Funciona como uma fila de espera visual.

**Busca e filtros**
O operador pode buscar um cliente pelo nome ou filtrar os cartões por etapa do processo (ex: aprovados, em análise, pendentes). Isso facilita a gestão de prioridades no dia.

**Exportar para o campo**
No final da organização do dia, o time pode exportar a lista de atendimentos em planilha para enviar aos técnicos ou gestores de campo.

> **Analogia para o CEO:** A Agenda é o quadro de turnos de uma operação de logística. Cada técnico tem seu "corredor" e o operador distribui as entregas do dia nos horários disponíveis, respeitando a capacidade e a rota de cada um.

---

## Como o Builder e a Agenda se Falam

Essa é a parte mais importante para entender o processo como um todo.

### Regra publicada → Agenda atualizada automaticamente

Quando uma nova regra é publicada no Builder, a Agenda é atualizada **em tempo real**, sem necessidade de ninguém fazer nada. Quem estiver usando a Agenda naquele momento já passa a trabalhar com as novas regras.

### Técnico inativo → Agenda bloqueia automaticamente

Se um técnico for desativado no Builder (porque saiu, ficou doente, ou está em outro projeto), ele desaparece das opções da Agenda. Ninguém consegue alocar atendimento para ele. Não há risco de erro humano.

### Regras guiam, humanos decidem

O sistema usa as regras para **sugerir** o melhor técnico para cada atendimento. Mas o operador pode **escolher diferente** se tiver uma razão. A automação serve como apoio à decisão, não como travamento do processo.

---

## Resumo do Fluxo Completo

```
Gestão define as regras no Builder
        ↓
Regras publicadas entram em vigor
        ↓
Operacional abre a Agenda no dia seguinte
        ↓
Cartões de clientes aparecem na grade
        ↓
Sistema sugere o técnico certo (com base nas regras)
        ↓
Operador confirma ou ajusta manualmente
        ↓
Grade completa = time de campo escalado para o dia
        ↓
Export para execução no campo
```

---

## Por Que Esse Modelo Funciona

| Problema comum em operações | Como o sistema resolve |
|---|---|
| Técnico alocado no bairro errado | Regras de cobertura por bairro bloqueiam erros |
| Dois atendimentos no mesmo horário | Sistema detecta conflito e impede |
| Técnico indisponível escalado por engano | Desativar no Builder remove da Agenda imediatamente |
| Mudança de regras causa retrabalho | Nova publicação no Builder atualiza tudo em tempo real |
| Falta de visibilidade do dia | Grade visual mostra o status de todos os técnicos de uma vez |

---

*Documento gerado em 07/04/2026 — visão operacional do sistema de agendamento da Gestão Mznet*
