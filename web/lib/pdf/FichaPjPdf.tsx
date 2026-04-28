import React from "react";
import { Document } from "@react-pdf/renderer";
import {
  FichaPage, PdfCard, PdfRow, PdfField, PdfTextarea,
  PdfDivider, PdfNotesList, PdfHighlightRow,
} from "./components";
import type { AppData, PjData, NoteItem } from "./fetchFichaData";

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

const V = "pj" as const;

type Props = { app: AppData; pj: PjData; notes: NoteItem[] };

export function FichaPjPdf({ app, pj, notes }: Props) {
  const title = app.primary_name ? `PJ — ${app.primary_name}` : "Ficha PJ";

  return (
    <Document>
      <FichaPage title={title} subtitle={app.cpf_cnpj || ""}>

        {/* ══ Dados básicos ══════════════════════════════════════════ */}
        <PdfCard>
          <PdfRow>
            <PdfField variant={V} label="Razão Social" value={app.primary_name}  flex={4} />
            <PdfField variant={V} label="CNPJ"         value={app.cpf_cnpj}      flex={2} />
            <PdfField variant={V} label="Abertura"     value={pj.data_abertura}  flex={1.5} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Nome Fantasia"  value={pj.nome_fantasia} flex={1} />
            <PdfField variant={V} label="Nome de Fachada" value={pj.nome_fachada} flex={1} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Área de Atuação" value={pj.area_atuacao} flex={1} />
          </PdfRow>

          <PdfDivider />

          {/* ══ Endereço ══════════════════════════════════════════════ */}

          <PdfRow>
            <PdfField variant={V} label="END"   value={app.address_line}       flex={5} />
            <PdfField variant={V} label="N"     value={app.address_number}     flex={0.7} />
            <PdfField variant={V} label="COMPL" value={app.address_complement} flex={3} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Tipo" value={pj.tipo_imovel}     flex={1} />
            <PdfField variant={V} label="OBS"  value={pj.obs_tipo_imovel} flex={3} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="CEP"   value={app.cep}           flex={1} />
            <PdfField variant={V} label="Bairro" value={app.bairro}       flex={1} />
            <PdfField variant={V} label="TEMPO" value={pj.tempo_endereco} flex={1} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Estabelecimento" value={pj.tipo_estabelecimento} flex={1} />
            <PdfField variant={V} label="OBS"             value={pj.obs_estabelecimento}  flex={3} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="TEL"   value={app.phone}    flex={1} />
            <PdfField variant={V} label="WHATS" value={app.whatsapp} flex={1} />
            <PdfField variant={V} label="FONE NO PS" value={pj.fones_ps} red flex={2} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="END NO PS" value={pj.end_ps} red flex={1} />
          </PdfRow>

          <PdfDivider />

          {/* ══ Contatos / Documentos ════════════════════════════════ */}

          <PdfRow>
            <PdfField variant={V} label="E-mail" value={app.email} flex={1} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Comprovante" value={pj.enviou_comprovante ? String(pj.enviou_comprovante) : ""} flex={1} />
            <PdfField variant={V} label="Tipo"        value={pj.tipo_comprovante}                                        flex={1} />
            <PdfField variant={V} label="Em Nome de"  value={pj.nome_comprovante}                                        flex={3} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Internet"  value={pj.possui_internet ? String(pj.possui_internet) : ""} flex={1} />
            <PdfField variant={V} label="Operadora" value={pj.operadora_internet}                                flex={1} />
            <PdfField variant={V} label="Plano"     value={pj.plano_internet}                                   flex={1} />
            <PdfField variant={V} label="Valor"     value={pj.valor_internet}                                   flex={1} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Contrato Social" value={pj.contrato_social ? String(pj.contrato_social) : ""} flex={1} />
            <PdfField variant={V} label="OBS"             value={pj.obs_contrato_social}                               flex={3} />
          </PdfRow>

          <PdfDivider />

          {/* ══ Sócios ════════════════════════════════════════════════ */}

          <PdfRow>
            <PdfField variant={V} label="Sócio 1" value={pj.socio1_nome}      flex={3} />
            <PdfField variant={V} label="CPF"     value={pj.socio1_cpf}       flex={2} />
            <PdfField variant={V} label="Tel"     value={pj.socio1_telefone}  flex={2} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Sócio 2" value={pj.socio2_nome}      flex={3} />
            <PdfField variant={V} label="CPF"     value={pj.socio2_cpf}       flex={2} />
            <PdfField variant={V} label="Tel"     value={pj.socio2_telefone}  flex={2} />
          </PdfRow>
          <PdfRow>
            <PdfField variant={V} label="Sócio 3" value={pj.socio3_nome}      flex={3} />
            <PdfField variant={V} label="CPF"     value={pj.socio3_cpf}       flex={2} />
            <PdfField variant={V} label="Tel"     value={pj.socio3_telefone}  flex={2} />
          </PdfRow>

          <PdfDivider />

          {/* ══ Solicitação ═══════════════════════════════════════════ */}

          <PdfRow>
            <PdfField variant={V} label="Quem Solicitou" value={app.quem_solicitou}       flex={1} />
            <PdfField variant={V} label="Meio"           value={app.meio}                 flex={1} />
            <PdfField variant={V} label="TEL"            value={app.telefone_solicitante} flex={1} />
          </PdfRow>

          <PdfHighlightRow>
            <PdfRow>
              <PdfField variant={V} label="Plano de Acesso" value={app.plano_acesso}              flex={4} />
              <PdfField variant={V} label="Vencimento"      value={app.venc ? String(app.venc) : ""} flex={1} />
            </PdfRow>
            <PdfTextarea variant={V} label="SVA Avulso" value={app.sva_avulso} />
            <PdfRow>
              <PdfField variant={V} label="Data"             value={formatCreatedAt(app.created_at)} flex={1} />
              <PdfField variant={V} label="Protocolo MK"     value={app.protocolo_mk}               flex={1} />
              <PdfField variant={V} label="Representante Mz" value={app.representante_mz}           flex={1} />
            </PdfRow>
          </PdfHighlightRow>

          <PdfDivider />

          {/* ══ Informações ═══════════════════════════════════════════ */}

          <PdfTextarea variant={V} label="Informações relevantes da solicitação" value={app.info_relevantes} />
          <PdfTextarea variant={V} label="Consulta SPC/Serasa"                   value={app.info_spc}         red tagStyle="black" />
          <PdfTextarea variant={V} label="Outras informações relevantes do PS"   value={app.info_pesquisador} red tagStyle="black" />
          <PdfTextarea variant={V} label="Informações Relevantes do MK"          value={app.info_mk}          red />
        </PdfCard>

        {/* ══ Parecer ════════════════════════════════════════════════ */}
        {notes.length > 0 && (
          <PdfCard title="Parecer da análise:" red noBorder>
            <PdfNotesList notes={notes} />
          </PdfCard>
        )}

      </FichaPage>
    </Document>
  );
}
