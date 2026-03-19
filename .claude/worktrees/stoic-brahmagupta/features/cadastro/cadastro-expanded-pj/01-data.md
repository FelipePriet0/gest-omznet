- Mapeamento dos campos → tabelas/colunas
- Condicionais (ex.: “Contrato Social”, “Possui Internet”, “Comprovante”).

🟦 SEÇÃO 1: DADOS DA EMPRESA

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Razão Social | text | ❌ NÃO | public.applicants | primary_name | Auto-save / Realtime |
| CNPJ | text | ❌ NÃO | public.applicants | cpf_cnpj | Auto-save / Realtime |
| Data de Abertura | text | ❌ NÃO | public.pj_fichas | data_abertura | Auto-save / Realtime |
| Nome Fantasia | text | ❌ NÃO | public.pj_fichas | nome_fantasia | Auto-save / Realtime |
| Nome de Fachada | text | ❌ NÃO | public.pj_fichas | nome_fachada | Auto-save / Realtime |
| Área de Atuação | text | ❌ NÃO | public.pj_fichas | area_atuacao | Auto-save / Realtime |

### 🟩 SEÇÃO 2: ENDEREÇO

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Endereço | text | ❌ NÃO | public.applicants | address_line | Auto-save / Realtime |
| Número | text | ❌ NÃO | public.applicants | address_number | Auto-save / Realtime |
| Complemento | text | ❌ NÃO | public.applicants | address_complement | Auto-save / Realtime |
| CEP | text | ❌ NÃO | public.applicants | cep | Auto-save / Realtime |
| Bairro | text | ❌ NÃO | public.applicants | bairro | Auto-save / Realtime |
| Tipo de Imóvel | text | ❌ NÃO | public.pj_fichas | tipo_imovel | Auto-save / Realtime |
| Obs Tipo de Imóvel | text | ❌ NÃO | public.pj_fichas | obs_tipo_imovel | Auto-save / Realtime |
| Tempo no Endereço | text | ❌ NÃO | public.pj_fichas | tempo_endereco | Auto-save / Realtime |
| Tipo de Estabelecimento | text | ❌ NÃO | public.pj_fichas | tipo_estabelecimento | Auto-save / Realtime |
| Obs Estabelecimento | text | ❌ NÃO | public.pj_fichas | obs_estabelecimento | Auto-save / Realtime |
| Endereço do PS | text | ❌ NÃO | public.pj_fichas | end_ps | Auto-save / Realtime |

0bs 1 : Tipo de imóvel é um campo com Dropdown, escolhas: “Comércio Terreo” / “Comércio Sala” / “Casa” .

Obs 2 : Estabelecimento é um campo com Dropdown, escolhas: “Própria” / “Alugada” / “ Cedida” “Outros” . 

### 🟨 SEÇÃO 3: CONTATOS E DOCUMENTOS

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Telefone | text | ❌ NÃO | public.applicants | phone | Auto-save / Realtime |
| WhatsApp | text | ❌ NÃO | public.applicants | whatsapp | Auto-save / Realtime |
| Fones no PS | text | ❌ NÃO | public.pj_fichas | fones_ps | Auto-save / Realtime |
| E-mail | text | ❌ NÃO | public.applicants | email | Auto-save / Realtime |
| Enviou Comprovante | text | ❌ NÃO | public.pj_fichas | enviou_comprovante | Auto-save / Realtime |
| Tipo de Comprovante | text | ❌ NÃO | public.pj_fichas | tipo_comprovante | Auto-save / Realtime |
| Nome do Comprovante | text | ❌ NÃO | public.pj_fichas | nome_comprovante | Auto-save / Realtime |
| Contrato Social | text | ❌ NÃO | public.pj_fichas | contrato_social | Auto-save / Realtime |
| Obs Contrato Social | text | ❌ NÃO | public.pj_fichas | obs_contrato_social | Auto-save / Realtime |
| Possui Internet | text | ❌ NÃO | public.pj_fichas | possui_internet | Auto-save / Realtime |
| Operadora Internet | text | ❌ NÃO | public.pj_fichas | operadora_internet | Auto-save / Realtime |
| Plano Internet | text | ❌ NÃO | public.pj_fichas | plano_internet | Auto-save / Realtime |
| Valor Internet | text | ❌ NÃO | public.pj_fichas | valor_internet | Auto-save / Realtime |

**Obs 1: “Enviou comprovante” é um Dropdown com (“Sim / “Não”). “Quando sim é selecionado o campo: “Tipo de comprovante de endereço”, que também é um dropdown com (”Energia” / “Agua” /  “Internet” / Outro”)+ “Nome do comprovante” se tornam obrigatório. 

Obs 2: “Tem internet fixa atualmente?” é um dropdown com: (”Sim”/”Não”)**

**Obs 3: “Contrato Social” é um dropdown (”Sim” / “Não”)** 

---

### 🟧 SEÇÃO 4: SÓCIOS

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Sócio 1 - Nome | text | ❌ NÃO | public.pj_fichas | socio1_nome | Auto-save / Realtime |
| Sócio 1 - CPF | text | ❌ NÃO | public.pj_fichas | socio1_cpf | Auto-save / Realtime |
| Sócio 1 - Telefone | text | ❌ NÃO | public.pj_fichas | socio1_telefone | Auto-save / Realtime |
| Sócio 2 - Nome | text | ❌ NÃO | public.pj_fichas | socio2_nome | Auto-save / Realtime |
| Sócio 2 - CPF | text | ❌ NÃO | public.pj_fichas | socio2_cpf | Auto-save / Realtime |
| Sócio 2 - Telefone | text | ❌ NÃO | public.pj_fichas | socio2_telefone | Auto-save / Realtime |
| Sócio 3 - Nome | text | ❌ NÃO | public.pj_fichas | socio3_nome | Auto-save / Realtime |
| Sócio 3 - CPF | text | ❌ NÃO | public.pj_fichas | socio3_cpf | Auto-save / Realtime |
| Sócio 3 - Telefone | text | ❌ NÃO | public.pj_fichas | socio3_telefone | Auto-save / Realtime |

---

### 🟪 SEÇÃO 5: SOLICITAÇÃO

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Quem Solicitou | text | ❌ NÃO | public.applicants | quem_solicitou | Auto-save / Realtime |
| Meio | text | ❌ NÃO | public.applicants | meio | Auto-save / Realtime |
| Tel Solicitante | text | ❌ NÃO | public.applicants | telefone_solicitante | Auto-save / Realtime |
| Protocolo MK | text | ❌ NÃO | public.applicants | protocolo_mk | Auto-save / Realtime |
| Plano Escolhido | text | ❌ NÃO | public.applicants | plano_acesso | Auto-save / Realtime |
| SVA Avulso | text | ❌ NÃO | public.applicants | sva_avulso | Auto-save / Realtime |
| Vencimento | text | ❌ NÃO | public.applicants | venc | Auto-save / Realtime |
| Carnê Impresso | Boolean | ❌ NÃO | public.applicants | carne_impresso | Auto-save / Realtime |

Obs: “Plano Escolhido” é um Dropdown, e dentro desse Dropdown incluimos 3 CTAs para dividirmos os Planos por categorias, segue o Fio: 

Normais: 

- 100 Mega - R$ 59,90
- 250 Mega - R$ 69,90
- 500 Mega - R$ 79,90
- 1000 Mega (1Gb) - R$ 99,90

**IP Dinâmico:** 

- 100 Mega + IP Dinâmico - R$ 74,90
- 250 Mega + IP Dinâmico - R$ 89,90
- 500 Mega + IP Dinâmico - R$ 94,90
- 1000 Mega (1Gb) + IP Dinâmico - R$ 114,90

**IP Fixo:** 

- 100 Mega + IP Fixo - R$ 259,90
- 250 Mega + IP Fixo - R$ 269,90
- 500 Mega + IP Fixo - R$ 279,90
- 1000 Mega (1Gb) + IP Fixo - R$ 299,90

**Obs2:** Vencimento é um Dropdown com: “5” / “10” / “15” / “20” / “25”

**Obs3:**  “Sva Avulso” é um dropdow, com:

### **Streaming e TV**

- MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)
- DEZZER: R$ 15,00
- MZ CINE-PLAY: R$ 19,90

### **Hardware e Equipamentos**

- SETUP BOX MZNET: R$ 100,00

### **Wi‑Fi Extend — Sem fio**

- 01 WI‑FI EXTEND (SEM FIO): R$ 25,90
- 02 WI‑FI EXTEND (SEM FIO): R$ 49,90
- 03 WI‑FI EXTEND (SEM FIO): R$ 74,90

### **Wi‑Fi Extend — Cabo**

- 01 WI‑FI EXTEND (CABEADO): R$ 35,90
- 02 WI‑FI EXTEND (CABEADO): R$ 69,90
- 03 WI‑FI EXTEND (CABEADO): R$ 100,00

**Obs 4:** “Carnê Impresso” é um dropdown com: “Sim” / “Não”

**Obs 5:** “Meio” é um dropdown com: “Ligação” / “Whatspp” / “Presensicial”  / ‘Whats - Uber”

---

### 🟥 SEÇÃO 6: INFORMAÇÕES RELEVANTES DA SOLICITAÇÃO

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Informações relevantes da solicitação | text | ❌ NÃO | public.applicants | info_relevantes | Auto-save / Realtime |

---

### 🟫 SEÇÃO 7: CONSULTA SPC/SERASA

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Consulta SPC/Serasa | text | ❌ NÃO | public.applicants | info_spc | Auto-save / Realtime |

---

### ⬛ SEÇÃO 8: OUTRAS INFORMAÇÕES RELEVANTES DO PS

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Outras informações relevantes do PS | text | ❌ NÃO | public.applicants | info_pesquisador | Auto-save / Realtime |

---

### 🟫 SEÇÃO 9: INFORMAÇÕES RELEVANTES DO MK

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Informações relevantes do MK | text | ❌ NÃO | public.applicants | info_mk | Auto-save / Realtime |

---

### 🟦 SEÇÃO 10: PARECER

| Campo | Tipo | Obrigatório | Tabela Backend | Coluna Backend | Hook |
| --- | --- | --- | --- | --- | --- |
| Parecer | text | ❌ NÃO | public.applicants | parecer_analise | Auto-save / Realtime |