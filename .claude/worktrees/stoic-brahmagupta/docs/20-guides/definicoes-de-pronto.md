💡 Objetivo do Documento

Definir o que significa “estar pronto” (DONE) para cada funcionalidade do sistema, em termos de entrega funcional, integração de dados e qualidade mínima esperada.
Essas definições guiam o Codex e os devs humanos durante o desenvolvimento e revisão.

📋 Estrutura Geral de Avaliação

Cada feature é considerada DONE somente quando:

1️⃣ Funciona do início ao fim conforme o fluxo do 00-spec.md.
2️⃣ Lê e grava dados reais nas tabelas do Supabase definidas em 01-data.md.
3️⃣ Apresenta a UI descrita em 02-ux.md, com feedbacks de estado claros.
4️⃣ Segue o contrato de API definido em 03-api.md.
5️⃣ Respeita as regras de acesso (RLS) de 04-rls.md.
6️⃣ Passa todos os critérios de aceite listados em 05-acceptance.md.
7️⃣ Não quebra nenhuma outra feature existente.