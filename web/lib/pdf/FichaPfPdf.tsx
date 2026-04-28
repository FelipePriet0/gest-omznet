import React from "react";
import { Document } from "@react-pdf/renderer";
import {
  FichaPage, PdfCard, PdfRow, PdfField, PdfTextarea,
  PdfDivider, PdfNotesList, PdfHighlightRow,
} from "./components";
import type { AppData, PfData, NoteItem } from "./fetchFichaData";

function formatCreatedAt(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const aa = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${aa} ${hh}:${min}`;
  } catch {
    return "";
  }
}

const V = "pf" as const;

type Props = { app: AppData; pf: PfData; notes: NoteItem[] };

export function FichaPfPdf({ app, pf, notes }: Props) {
  const title = app.primary_name ? `PF — ${app.primary_name}` : "Ficha PF";

  return (
    <Document>
      <FichaPage title={title} subtitle={app.cpf_cnpj || ""}>

        {/* ══ Dados pessoais / Endereço ══════════════════════════════ */}
        <PdfCard>
          {/* Linha 1: Nome | CPF | Nasc | ID */}
          <PdfRow>
            <PdfField variant={V} label="Nome"  value={app.primary_name}  flex={6} />
            <PdfField variant={V} label="CPF"   value={app.cpf_cnpj}      flex={2} />
            <PdfField variant={V} label="Nasc"  value={pf.birth_date}     flex={1.5} />
            <PdfField variant={V} label="ID"    value={pf.idade}          flex={0.7} />
          </PdfRow>

          {/* Linha 2: Tel | Whats | Do PS (compact) */}
          <PdfRow>
            <PdfField   variant={V} label="Tel"   value={app.phone}     flex={1.5} />
            <PdfField   variant={V} label="Whats" value={app.whatsapp}  flex={1.5} />
            <PdfTextarea variant={V} label="Do PS" value={pf.do_ps} red tagStyle="label" />
          </PdfRow>

          {/* Linha 3: Natural | UF | E-mail */}
          <PdfRow>
            <PdfField variant={V} label="Natural" value={pf.naturalidade}    flex={1.5} />
            <PdfField variant={V} label="UF"      value={pf.uf_naturalidade} flex={0.5} />
            <PdfField variant={V} label="E-mail"  value={app.email}          flex={4} />
          </PdfRow>

          {/* Linha 4: End | Nº | Compl */}
          <PdfRow>
            <PdfField variant={V} label="End"   value={app.address_line}        flex={5} />
            <PdfField variant={V} label="Nº"    value={app.address_number}      flex={0.8} />
            <PdfField variant={V} label="Compl" value={app.address_complement}  flex={3} />
          </PdfRow>

          {/* Linha 5: CEP | Bairro | Cond | Tempo */}
          <PdfRow>
            <PdfField variant={V} label="CEP"   value={app.cep}           flex={1} />
            <PdfField variant={V} label="Bairro" value={app.bairro}       flex={1} />
            <PdfField variant={V} label="Cond"  value={pf.cond}           flex={1} />
            <PdfField variant={V} label="Tempo" value={pf.tempo_endereco} flex={1} />
          </PdfRow>

          {/* Do PS (endereço) — linha vermelha */}
          <PdfTextarea variant={V} label="Do PS (endereço)" value={pf.endereco_do_ps} red />

          <PdfDivider />

          {/* ══ Residência ══════════════════════════════════════════ */}

          <PdfRow>
            <PdfField variant={V} label="Moradia" value={pf.tipo_moradia}     flex={1} />
            <PdfField variant={V} label="Obs"     value={pf.tipo_moradia_obs} flex={4} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Única no lote" value={pf.unica_no_lote}     flex={1} />
            <PdfField variant={V} label="Obs"           value={pf.unica_no_lote_obs} flex={4} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Reside com" value={pf.com_quem_reside} flex={2} />
            <PdfField variant={V} label="Nas outras"  value={pf.nas_outras}      flex={2} />
          </PdfRow>

          <PdfDivider />

          {/* ══ Contrato / Comprovante ══════════════════════════════ */}

          <PdfRow>
            <PdfField variant={V} label="Tem Contrato" value={pf.tem_contrato}      flex={1} />
            <PdfField variant={V} label="Enviou"       value={pf.enviou_contrato}   flex={1} />
            <PdfField variant={V} label="Nome De"      value={pf.nome_de}           flex={3} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Comprovante" value={pf.enviou_comprovante} flex={1} />
            <PdfField variant={V} label="Tipo"        value={pf.tipo_comprovante}   flex={1} />
            <PdfField variant={V} label="Nome"        value={pf.nome_comprovante}   flex={3} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Locador" value={pf.nome_locador}      flex={2} />
            <PdfField variant={V} label="Tel"     value={pf.telefone_locador}  flex={1.5} />
            <PdfField variant={V} label="Obs"     value={pf.locador_obs}       flex={2} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Internet fixa" value={pf.tem_internet_fixa}  flex={1} />
            <PdfField variant={V} label="Empresa"       value={pf.empresa_internet}   flex={1.5} />
            <PdfField variant={V} label="Plano"         value={pf.plano_internet}     flex={1.5} />
            <PdfField variant={V} label="Valor"         value={pf.valor_internet}     flex={1} />
          </PdfRow>

          <PdfDivider />

          {/* ══ Emprego ═════════════════════════════════════════════ */}

          <PdfRow>
            <PdfField variant={V} label="Profissão" value={pf.profissao} flex={1} />
            <PdfField variant={V} label="Empresa"   value={pf.empresa}   flex={1} />
            <PdfField variant={V} label="Vínculo"   value={pf.vinculo}   flex={1} />
          </PdfRow>
          <PdfTextarea variant={V} label="Do PS (emprego)" value={pf.emprego_do_ps} red />

          <PdfDivider />

          {/* ══ Cônjuge ═════════════════════════════════════════════ */}

          <PdfRow>
            <PdfField variant={V} label="Estado Civil" value={pf.estado_civil}  flex={1} />
            <PdfField variant={V} label="Obs"          value={pf.conjuge_obs}   flex={3} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Nome"  value={pf.conjuge_nome}      flex={2} />
            <PdfField variant={V} label="Tel"   value={pf.conjuge_telefone}  flex={1} />
            <PdfField variant={V} label="Whats" value={pf.conjuge_whatsapp}  flex={1} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="CPF"    value={pf.conjuge_cpf}          flex={1} />
            <PdfField variant={V} label="Natural" value={pf.conjuge_naturalidade} flex={1} />
            <PdfField variant={V} label="UF"     value={pf.conjuge_uf}           flex={0.5} />
            <PdfField variant={V} label="ID"     value={pf.conjuge_idade}        flex={0.5} />
          </PdfRow>
          <PdfTextarea variant={V} label="Do PS (cônjuge)" value={pf.conjuge_do_ps} red />

          <PdfDivider />

          {/* ══ Informações SPC / Pesquisador ═══════════════════════ */}
          <PdfTextarea variant={V} label="Informações SPC"             value={app.info_spc}         red tagStyle="black" />
          <PdfTextarea variant={V} label="Informações do Pesquisador"  value={app.info_pesquisador} red tagStyle="black" />

          <PdfDivider />

          {/* ══ Filiação ════════════════════════════════════════════ */}
          <PdfTextarea variant={V} label="Filiação do Solicitante (só perguntar se < 45 anos)" value={null} tagStyle="yellow" />

          <PdfRow>
            <PdfField variant={V} label="Pai"   value={pf.pai_nome}      flex={4} />
            <PdfField variant={V} label="Reside" value={pf.pai_reside}   flex={1.5} />
            <PdfField variant={V} label="Tel"    value={pf.pai_telefone} flex={1.5} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Mãe"   value={pf.mae_nome}      flex={4} />
            <PdfField variant={V} label="Reside" value={pf.mae_reside}   flex={1.5} />
            <PdfField variant={V} label="Tel"    value={pf.mae_telefone} flex={1.5} />
          </PdfRow>

          <PdfDivider />

          {/* ══ Referências ════════════════════════════════════════ */}
          <PdfTextarea variant={V} label="Referências Pessoais (de preferência parentes em 1º grau)" value={null} tagStyle="yellow" />

          <PdfRow>
            <PdfField variant={V} label=""          value={pf.ref1_nome}       flex={4} />
            <PdfField variant={V} label="Parentesco" value={pf.ref1_parentesco} flex={1.5} />
            <PdfField variant={V} label="Tel"        value={pf.ref1_telefone}   flex={1.5} />
            <PdfField variant={V} label="Reside"     value={pf.ref1_reside}     flex={1.5} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label=""          value={pf.ref2_nome}       flex={4} />
            <PdfField variant={V} label="Parentesco" value={pf.ref2_parentesco} flex={1.5} />
            <PdfField variant={V} label="Tel"        value={pf.ref2_telefone}   flex={1.5} />
            <PdfField variant={V} label="Reside"     value={pf.ref2_reside}     flex={1.5} />
          </PdfRow>

          <PdfDivider />

          {/* ══ Plano / MK ════════════════════════════════════════ */}
          <PdfHighlightRow>
            <PdfRow>
              <PdfField variant={V} label="Plano Escolhido" value={app.plano_acesso} flex={4} />
              <PdfField variant={V} label="Venc"            value={app.venc ? String(app.venc) : ""} flex={0.7} />
            </PdfRow>
            <PdfTextarea variant={V} label="SVA Avulso" value={app.sva_avulso} />
          </PdfHighlightRow>

          <PdfRow>
            <PdfField variant={V} label="Solicitante" value={app.quem_solicitou}       flex={1} />
            <PdfField variant={V} label="Meio"        value={app.meio}                 flex={1} />
            <PdfField variant={V} label="Fone"        value={app.telefone_solicitante} flex={1} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Data"            value={formatCreatedAt(app.created_at)} flex={1} />
            <PdfField variant={V} label="Protocolo MK"    value={app.protocolo_mk}               flex={1} />
            <PdfField variant={V} label="Representante Mz" value={app.representante_mz}          flex={1} />
          </PdfRow>

          <PdfTextarea variant={V} label="Informações relevantes"       value={app.info_relevantes} />
          <PdfTextarea variant={V} label="Informações Relevantes do MK" value={app.info_mk} red />
        </PdfCard>

        {/* ══ Parecer ══════════════════════════════════════════════ */}
        {notes.length > 0 && (
          <PdfCard title="Parecer" red noBorder>
            <PdfNotesList notes={notes} />
          </PdfCard>
        )}

      </FichaPage>
    </Document>
  );
}
