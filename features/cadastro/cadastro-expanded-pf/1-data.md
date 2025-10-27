- Mapeamento dos campos → tabelas/colunas

### **📋 EXPANDED FICHA** PF (Hooks: Tabelas  ↔ Colunas):

**1️⃣ Dados do Cliente (cliente)** 

| **Nome do Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| Nome completo | text | ✅ SIM | public.applicants | primary_name | Auto-save / Realtime |
| CPF | text | ✅ SIM | public.applicants | cpf_cnpj | Auto-save / Realtime |
| Data de Nascimento | date | ✅ SIM | public.pf_fichas | birth_date | Auto-save / Realtime |
| Telefone | text | ✅ SIM | public.applicants | phone | Auto-save |
| Whatsapp | text | ✅ SIM | public.applicants | whatsapp | Auto-save / Realtime |
| Do PS | text | ❌ NÃO | public.pf_fichas | **do_ps** | Auto-save / Realtime |
| E-mail | text | ❌ NÃO | public.applicants | email | Auto-save / Realtime |
| Naturalidade | text | ✅ SIM | public.pf_fichas | naturalidade | Auto-save / Realtime |
| uf | text | ✅ SIM | public.pf_fichas | uf_naturalidade | Auto-save / Realtime |
- Regras condicionais (ex.: “Alugada” ⇒ obrigar “Locador/Telefone”; “Enviou comprovante = Sim” ⇒ obrigar “Tipo/Nome”).

**2️⃣ Endereço (endereco)**

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| Endereço | text | ❌ NÃO | public.applicants | address_line | Auto-save / Realtime |
| Número | text | ❌ NÃO | public.applicants | address_number | Auto-save / Realtime |
| Complemento | text | ❌ NÃO | public.applicants | address_complement | Auto-save / Realtime |
| CEP | text | ❌ NÃO | public.applicants | cep | Auto-save / Realtime |
| Bairro | text | ❌ NÃO | public.applicants | bairro | Auto-save / Realtime |
| Cond | text | ❌ NÃO | public.pf_fichas | **cond** | Auto-save / Realtime |
| **Endereço Do PS** | text | ❌ NÃO | public.pf_fichas | **endereco_do_ps** | Auto-save / Realtime |
| Tempo | text | ❌ NÃO | public.pf_fichas | **tempo_endereco** | Auto-save / Realtime |
| Tipo de Moradia | text | ❌ NÃO | public.pf_fichas | **tipo_moradia** | Auto-save / Realtime |
| Observações | text | ❌ NÃO | public.pf_fichas | **tipo_moradia_obs** | Auto-save / Realtime |

0bs: Tipo de Moradia é um campo com Dropdown, escolhas: “Própria” / “Alugada” / “ Cedida” “Outros” . *Quando “Alugada” é selecionado o campo: “Locador” + “Telefone Locador” se torna obrigatório. 

*Quando a seleção: “Outros” no dropdown é selecionada, o campo observações fica como “OBRIGATÓRIO” 
(Como podemos fazer isso da melhor forma?? Pelo Front / Pelo Backend); 

**3️⃣ Relações de Residência**

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| Unica no lote  | text | ❌ NÃO | public.pf_fichas | **unica_no_lote** | Auto-save / Realtime |
| Unica No Lote Obs | text | ❌ NÃO | public.pf_fichas | **unica_no_lote_obs** | Auto-save / Realtime |
| Com quem Reside | text | ❌ NÃO | applicants | lives_with | Auto-save / Realtime |
| Nas outras | text | ❌ NÃO | public.pf_fichas | **nas_outras** | Auto-save / Realtime |
| Tem Contrato  | text | ❌ NÃO | public.pf_fichas | **tem_contrato** | Auto-save / Realtime |
| Enviou Contrato  | text | ❌ NÃO | public.pf_fichas | **enviou_contrato** | Auto-save / Realtime |
| Nome De | text | ❌ NÃO | public.pf_fichas | **nome_de** | Auto-save / Realtime |
| Enviou Comprovante | text | ❌ NÃO | public.pf_fichas | **enviou_comprovante** | Auto-save / Realtime |
| Tipo de Comprovante | text | ❌ NÃO | public.pf_fichas | **tipo_comprovante** | Auto-save / Realtime |
| Nome do Comprovante | text | ❌ NÃO | public.pf_fichas | **nome_comprovante** | Auto-save / Realtime |
| Nome Locador | text | ❌ NÃO | public.pf_fichas | **nome_locador** | Auto-save / Realtime |
| Telefone Locador | text | ❌ NÃO | public.pf_fichas | **telefone_locador** | Auto-save / Realtime |
| Internet Fixa | text | ❌ NÃO | public.pf_fichas | **tem_internet_fixa** | Auto-save / Realtime |
| Empresa Internet | text | ❌ NÃO | public.pf_fichas | **empresa_internet** | Auto-save / Realtime |
| Plano Internet | text | ❌ NÃO | public.pf_fichas | **plano_internet** | Auto-save / Realtime |
| valor Internet | text | ❌ NÃO | public.pf_fichas | **valor_internet** | Auto-save / Realtime |
| Observações | text | ❌ NÃO | public.pf_fichas | **observacoes** | Auto-save / Realtime |

Obs1: Campo: “Unica no Lote” também é um Dropdown com: (Sim/ Não). *Quando não é selecionado o campo “Unica no Lote Obs” se torna obrigatório.  

Obs2: Campo: “Nas Outras” é um Dropdown com: (”Parentes” / “Locador(a)” /  “Só conhecidos” / “Não conhece”). 

Obs3: Campo “Tem contrato” é um Dropdown, com (”Sim” / ”Não”). *Quando “sim” é selecionado o campo: “**Enviou contrato?” que também é um Dropdown com (”Sim” / “Não”) se torna obrigatório.  Se “Enviou Contrato” também for selecionado com “sim” o campo: “Nome de” se torna Obrigatório também. 

Obs 4: “Enviou comprovante” é um Dropdown com (“Sim / “Não”). “Quando sim é selecionado o campo: “Tipo de comprovante de endereço”, que também é um dropdown com (”Energia” / “Agua” /  “Internet” / Outro”)+ “Nome do comprovante” se tornam obrigatório. 

Obs 5: “Tem internet fixa atualmente?” é um dropdown com: (”Sim”/”Não”)**

**4️⃣ Emprego e Renda** 

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| Profissao | text | ❌ NÃO | public.pf_fichas | **profissao** | Auto-save / Realtime |
| Empresa | text | ❌ NÃO | public.pf_fichas | **empresa** | Auto-save / Realtime |
| Vinculo | text | ❌ NÃO | public.pf_fichas | **vinculo** | Auto-save / Realtime |
| Vinculo Obs | text | ❌ NÃO | public.pf_fichas | **vinculo_obs** | Auto-save / Realtime |
| **Emprego do ps** | text | ❌ NÃO | public.pf_fichas | **emprego_do_ps** | Auto-save / Realtime |

Obs: O campo “Vinculo” é um dropdown com: “Carteira Assinada” /  “Presta Serviços” / “Contrato de Trabalho” /  “Autonômo” / “Concursado” / “Outro”. *Quando “Outro” é selecionado o campo: “Observações” se torna obrigatório. 

**5️⃣ Cônjuge**

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| Estado Civil | text | ❌ NÃO | public.pf_fichas | **estado_civil** | Auto-save / Realtime |
| Observações | text | ❌ NÃO | public.pf_fichas | **conjuge_obs** | Auto-save / Realtime |
| **Nome** | text | ❌ NÃO | public.pf_fichas | **conjuge_nome** | Auto-save / Realtime |
| **Telefone** | text | ❌ NÃO | public.pf_fichas | **conjuge_telefone** | Auto-save / Realtime |
| Whatsapp | text | ❌ NÃO | public.pf_fichas | **conjuge_whatsapp** | Auto-save / Realtime |
| CPF | text | ❌ NÃO | public.pf_fichas | **conjuge_cpf** | Auto-save / Realtime |
| **Naturalidade** | text | ❌ NÃO | public.pf_fichas | **conjuge_naturalidade** | Auto-save / Realtime |
| UF  | text | ❌ NÃO | public.pf_fichas | **conjuge_uf** | Auto-save / Realtime |
| ID | integer | ❌ NÃO | public.pf_fichas | **conjuge_idade** | Auto-save / Realtime |
| Conjugue do PS | text | ❌ NÃO | public.pf_fichas | **conjuge_do_ps** | Auto-save / Realtime |

Obs: “Estado Civil” é um Dropdown com: “Solteiro(a)” / “Casado(a)” / “Amasiado(a)” / “Separado(a)” / “Viuvo(a)” 

**6️⃣ Informações SPC**  

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| **Informações SPC** | text | ❌ NÃO | public.applicants | **info_spc** | Auto-save / Realtime |

**7️⃣  Informações do Pesquisador**

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| **Informações do Pesquisador** | text | ❌ NÃO | public.applicants | **info_pesquisador** | Auto-save / Realtime |

8️⃣ **Filiação**

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| pai.nome | text | ❌ NÃO | public.pf_fichas | **pai_nome** | Auto-save / Realtime |
| pai.reside | text | ❌ NÃO | public.pf_fichas | **pai_reside** | Auto-save / Realtime |
| pai.telefone | text | ❌ NÃO | public.pf_fichas | **pai_telefone** | Auto-save / Realtime |
| mae.nome | text | ❌ NÃO | public.pf_fichas | **mae_nome** | Auto-save / Realtime |
| mae.reside | text | ❌ NÃO | public.pf_fichas | **mae_reside** | Auto-save / Realtime |
| mae.telefone | text | ❌ NÃO | public.pf_fichas | **mae_telefone** | Auto-save / Realtime |

9️⃣ **Referências** 

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| ref1.nome | text | ❌ NÃO | public.pf_fichas | **ref1_nome** | Auto-save / Realtime |
| ref1.parentesco | text | ❌ NÃO | public.pf_fichas | **ref1_parentesco** | Auto-save / Realtime |
| ref1.reside | text | ❌ NÃO | public.pf_fichas | **ref1_reside** | Auto-save / Realtime |
| ref1.telefone | text | ❌ NÃO | public.pf_fichas | **ref1_reside** | Auto-save / Realtime |
| ref2.nome | text | ❌ NÃO | public.pf_fichas | **ref2_nome** | Auto-save / Realtime |
| ref2.parentesco | text | ❌ NÃO | public.pf_fichas | **ref2_parentesco** | Auto-save / Realtime |
| ref2.reside | text | ❌ NÃO | public.pf_fichas | **ref2_reside** | Auto-save / Realtime |
| ref2.telefone | text | ❌ NÃO | public.pf_fichas | **ref2_telefone** | Auto-save / Realtime |

🔟**Outras Informações**

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| **Plano escolhido**  | text | ❌ NÃO | public.applicants | **plano_acesso** | Auto-save / Realtime |
| Vencimento | text | ❌ NÃO | public.applicants | **venc** | Auto-save / Realtime |
| Carne Impresso | Boolean | ❌ NÃO | public.applicants | **carne_impresso** | Auto-save / Realtime |
| sva Avulso | text | ❌ NÃO | public.applicants | **sva_avulso** | Auto-save / Realtime |
| Quem Solicitou | text | ❌ NÃO | public.applicants | **quem_solicitou** | Auto-save / Realtime |
| administrativas.meio | text | ❌ NÃO | public.applicants | **meio** | Auto-save / Realtime |
| administrativas.fone | text | ❌ NÃO | public.applicants | **telefone_solicitante** | Auto-save / Realtime |
| ProtocoloMk | text | ❌ NÃO | public.applicants | **protocolo_mk** | Auto-save / Realtime |

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

## **11. Informações relevantes**

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| **Informações relevantes** | text | ❌ NÃO | public.applicants | **info_relevantes** | Auto-save / Realtime |

## 12. Informações Relevantes do MK:

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| Informações Relevantes do MK | text | ❌ NÃO | public.applicants | **info_mk** | Auto-save / Realtime |

## 13. Parecer

| **Campo** | **Tipo** | **Obrigatório** | **Tabela Backend** | **Coluna Backend** | **Hook** |
| --- | --- | --- | --- | --- | --- |
| Parecer | text | ❌ NÃO | public.applicants | **parecer_analise** | Auto-save / Realtime |