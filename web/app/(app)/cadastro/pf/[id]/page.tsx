"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AppModel = {
  primary_name?: string;
  cpf_cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address_line?: string;
  address_number?: string;
  address_complement?: string;
  cep?: string;
  bairro?: string;
  plano_acesso?: string;
  venc?: string;
  sva_avulso?: string;
  carne_impresso?: boolean;
  quem_solicitou?: string;
  telefone_solicitante?: string;
  protocolo_mk?: string;
  meio?: string;
  info_spc?: string;
  info_pesquisador?: string;
  info_relevantes?: string;
  info_mk?: string;
  parecer_analise?: string;
};

type PfModel = {
  birth_date?: string | null;
  naturalidade?: string;
  uf_naturalidade?: string;
  do_ps?: string;
  cond?: string;
  endereco_do_ps?: string;
  tempo_endereco?: string;
  tipo_moradia?: string;
  tipo_moradia_obs?: string;
  unica_no_lote?: string;
  unica_no_lote_obs?: string;
  com_quem_reside?: string;
  nas_outras?: string;
  tem_contrato?: string;
  enviou_contrato?: string;
  nome_de?: string;
  enviou_comprovante?: string;
  tipo_comprovante?: string;
  nome_comprovante?: string;
  nome_locador?: string;
  telefone_locador?: string;
  tem_internet_fixa?: string;
  empresa_internet?: string;
  plano_internet?: string;
  valor_internet?: string;
  observacoes?: string;
  profissao?: string;
  empresa?: string;
  vinculo?: string;
  vinculo_obs?: string;
  emprego_do_ps?: string;
  estado_civil?: string;
  conjuge_obs?: string;
  conjuge_nome?: string;
  conjuge_telefone?: string;
  conjuge_whatsapp?: string;
  conjuge_cpf?: string;
  conjuge_naturalidade?: string;
  conjuge_uf?: string;
  conjuge_idade?: number | null;
  conjuge_do_ps?: string;
  pai_nome?: string;
  pai_reside?: string;
  pai_telefone?: string;
  mae_nome?: string;
  mae_reside?: string;
  mae_telefone?: string;
  ref1_nome?: string;
  ref1_parentesco?: string;
  ref1_reside?: string;
  ref1_telefone?: string;
  ref2_nome?: string;
  ref2_parentesco?: string;
  ref2_reside?: string;
  ref2_telefone?: string;
};

function digitsOnly(s: string) { return (s || "").replace(/\D+/g, ""); }
function formatDateBR(input: string) {
  const d = digitsOnly(input).slice(0, 8);
  const p1 = d.slice(0,2), p2 = d.slice(2,4), p3 = d.slice(4,8);
  return p2 ? `${p1}/${p2}${p3 ? `/${p3}`: ''}` : p1;
}
function isoToBR(iso?: any) {
  if (!iso) return "";
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y,m,d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return formatDateBR(s);
}
function brToISO(br: string) {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [_, d, mm, y] = m;
  return `${y}-${mm}-${d}`;
}
function maskPhone(input: string) {
  const d = digitsOnly(input).slice(0, 11);
  const len = d.length; const ddd = d.slice(0,2);
  if (len <= 2) return d;
  if (len <= 6) return `(${ddd}) ${d.slice(2)}`;
  if (len <= 10) return `(${ddd}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${ddd}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function formatCurrencyBR(input: string) {
  const d = digitsOnly(input);
  if (!d) return "";
  let n = d.replace(/^0+/, '');
  if (n.length === 0) n = '0';
  let intRaw = '0';
  let cents = '00';
  if (n.length <= 2) {
    cents = n.padStart(2, '0');
    intRaw = '0';
  } else {
    intRaw = n.slice(0, -2);
    cents = n.slice(-2);
  }
  const intWithSep = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${intWithSep},${cents}`;
}

export default function CadastroPFPage() {
  const params = useParams();
  const applicantId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [app, setApp] = useState<AppModel>({});
  const [pf, setPf] = useState<PfModel>({});
  const timer = useRef<NodeJS.Timeout | null>(null);
  const pendingApp = useRef<Partial<AppModel>>({});
  const pendingPf = useRef<Partial<PfModel>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        // Load applicants
        const { data: a, error: errA } = await supabase
          .from("applicants")
          .select("primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, quem_solicitou, telefone_solicitante, protocolo_mk, meio, info_spc, info_pesquisador, info_relevantes, info_mk, parecer_analise")
          .eq("id", applicantId)
          .single();
        if (!active) return;
        setApp(a || {});

        // Load or create pf_fichas row
        let { data: p, error: errP } = await supabase
          .from("pf_fichas")
          .select("*")
          .eq("applicant_id", applicantId)
          .maybeSingle();
        if (!p) {
          const { error: insErr } = await supabase.from("pf_fichas").insert({ applicant_id: applicantId });
          if (!insErr) {
            const { data: p2 } = await supabase.from("pf_fichas").select("*").eq("applicant_id", applicantId).maybeSingle();
            p = p2 || null;
          }
        }
        if (!active) return;
        const pfix: any = { ...(p as any) };
        if (pfix && pfix.birth_date) {
          pfix.birth_date = isoToBR(pfix.birth_date);
        }
        setPf(pfix || {});
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [applicantId]);

  async function flushAutosave() {
    if (!applicantId) return;
    const appPayload = pendingApp.current;
    const pfPayload = pendingPf.current;
    pendingApp.current = {};
    pendingPf.current = {};
    if (Object.keys(appPayload).length === 0 && Object.keys(pfPayload).length === 0) return;
    setSaving("saving");
    try {
      if (Object.keys(appPayload).length > 0) {
        await supabase.from("applicants").update(appPayload).eq("id", applicantId);
      }
      if (Object.keys(pfPayload).length > 0) {
        const patch: any = { ...pfPayload };
        if (patch.birth_date) {
          const iso = brToISO(String(patch.birth_date));
          patch.birth_date = iso;
        }
        if (typeof patch.unica_no_lote !== 'undefined') {
          // map 'Sim'/'Não' → boolean, else pass-through
          if (patch.unica_no_lote === 'Sim') patch.unica_no_lote = true;
          else if (patch.unica_no_lote === 'Não') patch.unica_no_lote = false;
        }
        await supabase.from("pf_fichas").update(patch).eq("applicant_id", applicantId);
      }
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1200);
    } catch (e) {
      setSaving("error");
    }
  }

  function queueSave(scope: "app"|"pf", key: string, value: any) {
    if (scope === "app") { pendingApp.current = { ...pendingApp.current, [key]: value }; }
    else { pendingPf.current = { ...pendingPf.current, [key]: value }; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flushAutosave, 700);
  }

  const statusText = useMemo(() => (
    saving === "saving" ? "Salvando…" : saving === "saved" ? "Salvo" : saving === "error" ? "Erro ao salvar" : ""
  ), [saving]);

  const PLANO_OPTIONS: ({label:string,value:string,disabled?:boolean})[] = [
    { label: '— Normais —', value: '__hdr_norm', disabled: true },
    { label: '100 Mega - R$ 59,90', value: '100 Mega - R$ 59,90' },
    { label: '250 Mega - R$ 69,90', value: '250 Mega - R$ 69,90' },
    { label: '500 Mega - R$ 79,90', value: '500 Mega - R$ 79,90' },
    { label: '1000 Mega (1Gb) - R$ 99,90', value: '1000 Mega (1Gb) - R$ 99,90' },
    { label: '— IP Dinâmico —', value: '__hdr_ipdin', disabled: true },
    { label: '100 Mega + IP Dinâmico - R$ 74,90', value: '100 Mega + IP Dinâmico - R$ 74,90' },
    { label: '250 Mega + IP Dinâmico - R$ 89,90', value: '250 Mega + IP Dinâmico - R$ 89,90' },
    { label: '500 Mega + IP Dinâmico - R$ 94,90', value: '500 Mega + IP Dinâmico - R$ 94,90' },
    { label: '1000 Mega (1Gb) + IP Dinâmico - R$ 114,90', value: '1000 Mega (1Gb) + IP Dinâmico - R$ 114,90' },
    { label: '— IP Fixo —', value: '__hdr_ipfixo', disabled: true },
    { label: '100 Mega + IP Fixo - R$ 259,90', value: '100 Mega + IP Fixo - R$ 259,90' },
    { label: '250 Mega + IP Fixo - R$ 269,90', value: '250 Mega + IP Fixo - R$ 269,90' },
    { label: '500 Mega + IP Fixo - R$ 279,90', value: '500 Mega + IP Fixo - R$ 279,90' },
    { label: '1000 Mega (1Gb) + IP Fixo - R$ 299,90', value: '1000 Mega (1Gb) + IP Fixo - R$ 299,90' },
  ];

  const SVA_OPTIONS: ({label:string,value:string,disabled?:boolean})[] = [
    { label: '— Streaming e TV —', value: '__hdr_stream', disabled: true },
    { label: 'MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)', value: 'MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)' },
    { label: 'DEZZER: R$ 15,00', value: 'DEZZER: R$ 15,00' },
    { label: 'MZ CINE-PLAY: R$ 19,90', value: 'MZ CINE-PLAY: R$ 19,90' },
    { label: '— Hardware e Equipamentos —', value: '__hdr_hw', disabled: true },
    { label: 'SETUP BOX MZNET: R$ 100,00', value: 'SETUP BOX MZNET: R$ 100,00' },
    { label: '— Wi‑Fi Extend — Sem fio —', value: '__hdr_wifi_sf', disabled: true },
    { label: '01 WI‑FI EXTEND (SEM FIO): R$ 25,90', value: '01 WI‑FI EXTEND (SEM FIO): R$ 25,90' },
    { label: '02 WI‑FI EXTEND (SEM FIO): R$ 49,90', value: '02 WI‑FI EXTEND (SEM FIO): R$ 49,90' },
    { label: '03 WI‑FI EXTEND (SEM FIO): R$ 74,90', value: '03 WI‑FI EXTEND (SEM FIO): R$ 74,90' },
    { label: '— Wi‑Fi Extend — Cabo —', value: '__hdr_wifi_cab', disabled: true },
    { label: '01 WI‑FI EXTEND (CABEADO): R$ 35,90', value: '01 WI‑FI EXTEND (CABEADO): R$ 35,90' },
    { label: '02 WI‑FI EXTEND (CABEADO): R$ 69,90', value: '02 WI‑FI EXTEND (CABEADO): R$ 69,90' },
    { label: '03 WI‑FI EXTEND (CABEADO): R$ 100,00', value: '03 WI‑FI EXTEND (CABEADO): R$ 100,00' },
  ];

  if (loading) return <div className="p-4 text-sm text-zinc-600">Carregando…</div>;

  // Validações condicionais
  const reqLocador = (pf.tipo_moradia || '').toLowerCase() === 'alugada';
  const reqObs = (pf.tipo_moradia || '').toLowerCase() === 'outros';
  const reqUnicaObs = (pf.unica_no_lote || '') === 'Não';
  const reqEnviouContrato = (pf.tem_contrato || '') === 'Sim';
  const reqNomeDe = reqEnviouContrato && (pf.enviou_contrato || '') === 'Sim';
  const reqComprovante = (pf.enviou_comprovante || '') === 'Sim';
  const reqVinculoObs = (pf.vinculo || '') === 'Outro';

  const errs = {
    nome_locador: reqLocador && !(pf.nome_locador || '').trim(),
    telefone_locador: reqLocador && !(pf.telefone_locador || '').trim(),
    tipo_moradia_obs: reqObs && !(pf.tipo_moradia_obs || '').trim(),
    unica_no_lote_obs: reqUnicaObs && !(pf.unica_no_lote_obs || '').trim(),
    enviou_contrato: reqEnviouContrato && !(pf.enviou_contrato || '').trim(),
    nome_de: reqNomeDe && !(pf.nome_de || '').trim(),
    tipo_comprovante: reqComprovante && !(pf.tipo_comprovante || '').trim(),
    nome_comprovante: reqComprovante && !(pf.nome_comprovante || '').trim(),
    vinculo_obs: reqVinculoObs && !(pf.vinculo_obs || '').trim(),
  } as const;

  function onDownloadPdf() {
    try { window.print(); } catch {}
  }
  function onClosePage() {
    try { window.close(); } catch {}
    try { history.back(); } catch {}
  }

  return (
    <div className="mz-form p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Ficha PF — Expanded</h1>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-600">{statusText}</div>
          <button
            onClick={onDownloadPdf}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            title="Baixar PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 inline mr-1 align-[-2px]">
              <path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1z" />
              <path d="M5 20a2 2 0 002 2h10a2 2 0 002-2v-3a1 1 0 112 0v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3a1 1 0 112 0v3z" />
            </svg>
            Baixar PDF
          </button>
          <button
            onClick={onClosePage}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            title="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 inline mr-1 align-[-2px]">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L12 10.586l6.293-6.293a1 1 0 111.414 1.414L13.414 12l6.293 6.293a1 1 0 01-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 01-1.414-1.414L10.586 12 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Fechar
          </button>
        </div>
      </div>

      {/* Seção 1: Dados do Cliente */}
      <Card title="Dados do Cliente">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Linha 1 */}
          <Field label="Nome do Cliente" value={app.primary_name || ""} onChange={(v)=>{ setApp({...app, primary_name:v}); queueSave("app","primary_name", v); }} />
          <Field label="CPF" value={app.cpf_cnpj || ""} onChange={(v)=>{ setApp({...app, cpf_cnpj:v}); queueSave("app","cpf_cnpj", v); }} />
          <Field label="Data de Nascimento" value={pf.birth_date ? formatDateBR(pf.birth_date as any) : ""} onChange={(v)=>{ setPf({...pf, birth_date: v}); queueSave("pf","birth_date", v); }} />
          <Field label="ID" value={applicantId} onChange={()=>{}} className="opacity-60" />
          {/* Linha 2 */}
          <Field label="Telefone" value={app.phone || ""} onChange={(v)=>{ const m=maskPhone(v); setApp({...app, phone:m}); queueSave("app","phone", m); }} />
          <Field label="WhatsApp" value={app.whatsapp || ""} onChange={(v)=>{ const m=maskPhone(v); setApp({...app, whatsapp:m}); queueSave("app","whatsapp", m); }} />
          <Textarea label="Do PS" value={pf.do_ps || ""} onChange={(v)=>{ setPf({...pf, do_ps:v}); queueSave("pf","do_ps", v); }} red />
          <div />
          {/* Linha 3 */}
          <Field label="Naturalidade" value={pf.naturalidade || ""} onChange={(v)=>{ setPf({...pf, naturalidade:v}); queueSave("pf","naturalidade", v); }} />
          <Field label="UF" value={pf.uf_naturalidade || ""} onChange={(v)=>{ setPf({...pf, uf_naturalidade:v}); queueSave("pf","uf_naturalidade", v); }} />
          <Field label="E-mail" value={app.email || ""} onChange={(v)=>{ setApp({...app, email:v}); queueSave("app","email", v); }} />
          <div />
        </div>
      </Card>

      {/* Seção 2: Endereço */}
      <Card title="Endereço">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Endereço" value={app.address_line || ""} onChange={(v)=>{ setApp({...app, address_line:v}); queueSave("app","address_line", v); }} className="col-span-2" />
          <Field label="Número" value={app.address_number || ""} onChange={(v)=>{ setApp({...app, address_number:v}); queueSave("app","address_number", v); }} />
          <Field label="Complemento" value={app.address_complement || ""} onChange={(v)=>{ setApp({...app, address_complement:v}); queueSave("app","address_complement", v); }} />
          <Field label="CEP" value={app.cep || ""} onChange={(v)=>{ setApp({...app, cep:v}); queueSave("app","cep", v); }} />
          <Field label="Bairro" value={app.bairro || ""} onChange={(v)=>{ setApp({...app, bairro:v}); queueSave("app","bairro", v); }} />
          <Field label="Cond" value={pf.cond || ""} onChange={(v)=>{ setPf({...pf, cond:v}); queueSave("pf","cond", v); }} />
          <Field label="Endereço Do PS" value={pf.endereco_do_ps || ""} onChange={(v)=>{ setPf({...pf, endereco_do_ps:v}); queueSave("pf","endereco_do_ps", v); }} red className="md:col-span-3" />
          <Field label="Tempo" value={pf.tempo_endereco || ""} onChange={(v)=>{ setPf({...pf, tempo_endereco:v}); queueSave("pf","tempo_endereco", v); }} />
          <Select label="Tipo de Moradia" value={pf.tipo_moradia || ""} onChange={(v)=>{ setPf({...pf, tipo_moradia:v}); queueSave("pf","tipo_moradia", v); }} options={["Própria","Alugada","Cedida","Outros"]} />
          <Field label="Observações" value={pf.tipo_moradia_obs || ""} onChange={(v)=>{ setPf({...pf, tipo_moradia_obs:v}); queueSave("pf","tipo_moradia_obs", v); }} error={errs.tipo_moradia_obs} requiredMark={reqObs} />
        </div>
        {/* Checklist removido: agora marcamos no label dos campos obrigatórios */}
      </Card>

      {/* Seção 3: Relações de Residência */}
      <Card title="Relações de Residência">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Linha 1 */}
          <Select label="Única no lote" value={pf.unica_no_lote || ""} onChange={(v)=>{ setPf({...pf, unica_no_lote:v}); queueSave("pf","unica_no_lote", v); }} options={["Sim","Não"]} />
          <Field label="Única no lote (Obs)" value={pf.unica_no_lote_obs || ""} onChange={(v)=>{ setPf({...pf, unica_no_lote_obs:v}); queueSave("pf","unica_no_lote_obs", v); }} error={errs.unica_no_lote_obs} requiredMark={reqUnicaObs} className="md:col-span-2" />
          {/* Linha 2 */}
          <Field label="Com quem reside" value={pf.com_quem_reside || ""} onChange={(v)=>{ setPf({...pf, com_quem_reside:v}); queueSave("pf","com_quem_reside", v); }} className="md:col-span-2" />
          <Select label="Nas outras" value={pf.nas_outras || ""} onChange={(v)=>{ setPf({...pf, nas_outras:v}); queueSave("pf","nas_outras", v); }} options={["Parentes","Locador(a)","Só conhecidos","Não conhece"]} />
          {/* Linha 3 */}
          <Select label="Tem Contrato" value={pf.tem_contrato || ""} onChange={(v)=>{ setPf({...pf, tem_contrato:v}); queueSave("pf","tem_contrato", v); if (v === 'Não') { setPf(prev=>({ ...prev, enviou_contrato:'', nome_de:'' })); queueSave('pf','enviou_contrato',''); queueSave('pf','nome_de',''); } }} options={["Sim","Não"]} />
          <Select label="Enviou Contrato" value={pf.enviou_contrato || ""} onChange={(v)=>{ setPf({...pf, enviou_contrato:v}); queueSave("pf","enviou_contrato", v); if (v !== 'Sim') { setPf(prev=>({ ...prev, nome_de:'' })); queueSave('pf','nome_de',''); } }} options={["Sim","Não"]} error={errs.enviou_contrato} requiredMark={reqEnviouContrato} disabled={!reqEnviouContrato} />
          <Field label="Nome De" value={pf.nome_de || ""} onChange={(v)=>{ setPf({...pf, nome_de:v}); queueSave("pf","nome_de", v); }} error={errs.nome_de} requiredMark={reqNomeDe} disabled={!reqNomeDe} />
          {/* Linha 4 */}
          <Select label="Enviou Comprovante" value={pf.enviou_comprovante || ""} onChange={(v)=>{ setPf({...pf, enviou_comprovante:v}); queueSave("pf","enviou_comprovante", v); if (v === 'Não') { setPf(prev=>({ ...prev, tipo_comprovante:'', nome_comprovante:'' })); queueSave('pf','tipo_comprovante',''); queueSave('pf','nome_comprovante',''); } }} options={["Sim","Não"]} requiredMark={reqComprovante} />
          <Select label="Tipo de Comprovante" value={pf.tipo_comprovante || ""} onChange={(v)=>{ setPf({...pf, tipo_comprovante:v}); queueSave("pf","tipo_comprovante", v); }} options={["Energia","Agua","Internet","Outro"]} error={errs.tipo_comprovante} requiredMark={reqComprovante} disabled={!reqComprovante} />
          <Field label="Nome do Comprovante" value={pf.nome_comprovante || ""} onChange={(v)=>{ setPf({...pf, nome_comprovante:v}); queueSave("pf","nome_comprovante", v); }} error={errs.nome_comprovante} requiredMark={reqComprovante} disabled={!reqComprovante} />
          {/* Linha 5 */}
          <Field label="Nome Locador" value={pf.nome_locador || ""} onChange={(v)=>{ setPf({...pf, nome_locador:v}); queueSave("pf","nome_locador", v); }} error={errs.nome_locador} requiredMark={reqLocador} className="md:col-span-2" />
          <Field label="Telefone Locador" value={pf.telefone_locador || ""} onChange={(v)=>{ setPf({...pf, telefone_locador:v}); queueSave("pf","telefone_locador", v); }} error={errs.telefone_locador} requiredMark={reqLocador} />
          {/* Linha 6 */}
          <Select label="Tem internet fixa atualmente?" value={pf.tem_internet_fixa || ""} onChange={(v)=>{ setPf({...pf, tem_internet_fixa:v}); queueSave("pf","tem_internet_fixa", v); }} options={["Sim","Não"]} />
          <Field label="Empresa Internet" value={pf.empresa_internet || ""} onChange={(v)=>{ setPf({...pf, empresa_internet:v}); queueSave("pf","empresa_internet", v); }} />
          <Field label="Plano Internet" value={pf.plano_internet || ""} onChange={(v)=>{ setPf({...pf, plano_internet:v}); queueSave("pf","plano_internet", v); }} />
          <Field label="Valor Internet" value={pf.valor_internet || ""} onChange={(v)=>{ const m = formatCurrencyBR(v); setPf({...pf, valor_internet:m}); queueSave("pf","valor_internet", m); }} />
          {/* Linha 7 */}
          <Textarea label="Observações" value={pf.observacoes || ""} onChange={(v)=>{ setPf({...pf, observacoes:v}); queueSave("pf","observacoes", v); }} className="md:col-span-3" />
        </div>
        {/* Checklist removido: agora marcamos no label dos campos obrigatórios */}
      </Card>

      {/* Seções complementares resumidas (Emprego/Renda, Cônjuge, Filiação, Referências, Outras Inf, MK, Parecer) */}
      <Card title="Emprego e Renda">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Profissão" value={pf.profissao || ""} onChange={(v)=>{ setPf({...pf, profissao:v}); queueSave("pf","profissao", v); }} />
          <Field label="Empresa" value={pf.empresa || ""} onChange={(v)=>{ setPf({...pf, empresa:v}); queueSave("pf","empresa", v); }} />
          <Select label="Vínculo" value={pf.vinculo || ""} onChange={(v)=>{ setPf({...pf, vinculo:v}); queueSave("pf","vinculo", v); }} options={["Carteira Assinada","Presta Serviços","Contrato de Trabalho","Autonômo","Concursado","Outro"]} />
          <Field label="Vínculo (Obs)" value={pf.vinculo_obs || ""} onChange={(v)=>{ setPf({...pf, vinculo_obs:v}); queueSave("pf","vinculo_obs", v); }} error={errs.vinculo_obs} requiredMark={reqVinculoObs} />
          <Field label="Emprego do PS" value={pf.emprego_do_ps || ""} onChange={(v)=>{ setPf({...pf, emprego_do_ps:v}); queueSave("pf","emprego_do_ps", v); }} red className="lg:col-span-4" />
        </div>
        </Card>

      <Card title="Cônjuge">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Linha 1 */}
          <Select label="Estado Civil" value={pf.estado_civil || ""} onChange={(v)=>{ setPf({...pf, estado_civil:v}); queueSave("pf","estado_civil", v); }} options={["Solteiro(a)","Casado(a)","Amasiado(a)","Separado(a)","Viuvo(a)"]} />
          <Field label="Observações" value={pf.conjuge_obs || ""} onChange={(v)=>{ setPf({...pf, conjuge_obs:v}); queueSave("pf","conjuge_obs", v); }} className="lg:col-span-3" />
          {/* Linha 2 */}
          <Field label="Nome" value={pf.conjuge_nome || ""} onChange={(v)=>{ setPf({...pf, conjuge_nome:v}); queueSave("pf","conjuge_nome", v); }} className="lg:col-span-2" />
          <Field label="Telefone" value={pf.conjuge_telefone || ""} onChange={(v)=>{ setPf({...pf, conjuge_telefone:v}); queueSave("pf","conjuge_telefone", v); }} />
          <Field label="Whatsapp" value={pf.conjuge_whatsapp || ""} onChange={(v)=>{ setPf({...pf, conjuge_whatsapp:v}); queueSave("pf","conjuge_whatsapp", v); }} />
          {/* Linha 3 */}
          <Field label="CPF" value={pf.conjuge_cpf || ""} onChange={(v)=>{ setPf({...pf, conjuge_cpf:v}); queueSave("pf","conjuge_cpf", v); }} />
          <Field label="Naturalidade" value={pf.conjuge_naturalidade || ""} onChange={(v)=>{ setPf({...pf, conjuge_naturalidade:v}); queueSave("pf","conjuge_naturalidade", v); }} />
          <Field label="UF" value={pf.conjuge_uf || ""} onChange={(v)=>{ setPf({...pf, conjuge_uf:v}); queueSave("pf","conjuge_uf", v); }} />
          <Field label="Idade" value={pf.conjuge_idade?.toString() || ""} onChange={(v)=>{ const n = v ? parseInt(v,10) : null; setPf({...pf, conjuge_idade:n}); queueSave("pf","conjuge_idade", n); }} />
          {/* Linha 4 */}
          <Field label="Do PS" value={pf.conjuge_do_ps || ""} onChange={(v)=>{ setPf({...pf, conjuge_do_ps:v}); queueSave("pf","conjuge_do_ps", v); }} red className="lg:col-span-4" />
        </div>
      </Card>

      <Card title="Filiação">
        <Grid cols={3}>
          <Field label="Pai — Nome" value={pf.pai_nome || ""} onChange={(v)=>{ setPf({...pf, pai_nome:v}); queueSave("pf","pai_nome", v); }} />
          <Field label="Pai — Reside" value={pf.pai_reside || ""} onChange={(v)=>{ setPf({...pf, pai_reside:v}); queueSave("pf","pai_reside", v); }} />
          <Field label="Pai — Telefone" value={pf.pai_telefone || ""} onChange={(v)=>{ setPf({...pf, pai_telefone:v}); queueSave("pf","pai_telefone", v); }} />
          <Field label="Mãe — Nome" value={pf.mae_nome || ""} onChange={(v)=>{ setPf({...pf, mae_nome:v}); queueSave("pf","mae_nome", v); }} />
          <Field label="Mãe — Reside" value={pf.mae_reside || ""} onChange={(v)=>{ setPf({...pf, mae_reside:v}); queueSave("pf","mae_reside", v); }} />
          <Field label="Mãe — Telefone" value={pf.mae_telefone || ""} onChange={(v)=>{ setPf({...pf, mae_telefone:v}); queueSave("pf","mae_telefone", v); }} />
        </Grid>
      </Card>

      <Card title="Referências Pessoais">
        <Grid cols={4}>
          <Field label="Ref1 — Nome" value={pf.ref1_nome || ""} onChange={(v)=>{ setPf({...pf, ref1_nome:v}); queueSave("pf","ref1_nome", v); }} />
          <Field label="Parentesco" value={pf.ref1_parentesco || ""} onChange={(v)=>{ setPf({...pf, ref1_parentesco:v}); queueSave("pf","ref1_parentesco", v); }} />
          <Field label="Reside" value={pf.ref1_reside || ""} onChange={(v)=>{ setPf({...pf, ref1_reside:v}); queueSave("pf","ref1_reside", v); }} />
          <Field label="Telefone" value={pf.ref1_telefone || ""} onChange={(v)=>{ setPf({...pf, ref1_telefone:v}); queueSave("pf","ref1_telefone", v); }} />
          <Field label="Ref2 — Nome" value={pf.ref2_nome || ""} onChange={(v)=>{ setPf({...pf, ref2_nome:v}); queueSave("pf","ref2_nome", v); }} />
          <Field label="Parentesco" value={pf.ref2_parentesco || ""} onChange={(v)=>{ setPf({...pf, ref2_parentesco:v}); queueSave("pf","ref2_parentesco", v); }} />
          <Field label="Reside" value={pf.ref2_reside || ""} onChange={(v)=>{ setPf({...pf, ref2_reside:v}); queueSave("pf","ref2_reside", v); }} />
          <Field label="Telefone" value={pf.ref2_telefone || ""} onChange={(v)=>{ setPf({...pf, ref2_telefone:v}); queueSave("pf","ref2_telefone", v); }} />
        </Grid>
      </Card>

      <Card title="Informações SPC / Pesquisador">
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Informações SPC" value={app.info_spc || ""} onChange={(v)=>{ setApp({...app, info_spc:v}); queueSave("app","info_spc", v); }} red />
          <Textarea label="Informações do Pesquisador" value={app.info_pesquisador || ""} onChange={(v)=>{ setApp({...app, info_pesquisador:v}); queueSave("app","info_pesquisador", v); }} red />
        </div>
      </Card>

      <Card title="Outras Informações / MK">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-2">
            <Select
              label="Plano escolhido"
              value={app.plano_acesso || ""}
              onChange={(v)=>{ setApp({...app, plano_acesso:v}); queueSave("app","plano_acesso", v); }}
              options={PLANO_OPTIONS as any}
            />
          </div>

          <Select
            label="Vencimento"
            value={app.venc || ""}
            onChange={(v)=>{ setApp({...app, venc:v}); queueSave("app","venc", v); }}
            options={["5","10","15","20","25"]}
          />
          <Select
            label="SVA Avulso"
            value={app.sva_avulso || ""}
            onChange={(v)=>{ setApp({...app, sva_avulso:v}); queueSave("app","sva_avulso", v); }}
            options={SVA_OPTIONS as any}
          />
          <Select label="Carnê impresso" value={app.carne_impresso ? "Sim" : "Não"} onChange={(v)=>{ const val = (v === 'Sim'); setApp({...app, carne_impresso: val}); queueSave("app","carne_impresso", val); }} options={["Sim","Não"]} />
          <Field label="Quem solicitou" value={app.quem_solicitou || ""} onChange={(v)=>{ setApp({...app, quem_solicitou:v}); queueSave("app","quem_solicitou", v); }} />
          <Field label="Telefone do solicitante" value={app.telefone_solicitante || ""} onChange={(v)=>{ setApp({...app, telefone_solicitante:v}); queueSave("app","telefone_solicitante", v); }} />
          <Field label="Protocolo MK" value={app.protocolo_mk || ""} onChange={(v)=>{ setApp({...app, protocolo_mk:v}); queueSave("app","protocolo_mk", v); }} />
          <Select label="Meio" value={app.meio || ""} onChange={(v)=>{ setApp({...app, meio:v}); queueSave("app","meio", v); }} options={["Ligação","Whatspp","Presensicial","Whats - Uber"]} />
          <Textarea label="Informações relevantes" value={app.info_relevantes || ""} onChange={(v)=>{ setApp({...app, info_relevantes:v}); queueSave("app","info_relevantes", v); }} className="lg:col-span-4" />
          <Textarea label="Informações Relevantes do MK" value={app.info_mk || ""} onChange={(v)=>{ setApp({...app, info_mk:v}); queueSave("app","info_mk", v); }} red className="lg:col-span-4" />
        </div>
      </Card>

      <Card title="Parecer">
        <Grid cols={1}>
          <Textarea label="Parecer" value={app.parecer_analise || ""} onChange={(v)=>{ setApp({...app, parecer_analise:v}); queueSave("app","parecer_analise", v); }} />
        </Grid>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border bg-white shadow-sm">
      <div className="border-b px-4 py-2 text-sm font-semibold text-gray-800">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Grid({ cols, children }: { cols: 1|2|3|4; children: React.ReactNode }) {
  const cls = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-4";
  return <div className={`grid gap-4 ${cls}`}>{children}</div>;
}

function Field({ label, value, onChange, className, error, red, requiredMark, disabled }: { label: string; value: string; onChange: (v: string)=>void; className?: string; error?: boolean; red?: boolean; requiredMark?: boolean; disabled?: boolean }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-700">
        <span>{label}</span>
        {requiredMark && (
          <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold align-middle ${error ? 'border-red-300 bg-red-100 text-red-700' : 'border-emerald-300 bg-emerald-100 text-emerald-700'}`}>
            Obrigatório
          </span>
        )}
      </label>
      <input
        value={value}
        onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
        disabled={disabled}
        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-emerald-700'} placeholder:text-emerald-600 placeholder:opacity-60 ${error || red ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-2 focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500'}`}
        placeholder=""
        autoComplete="off"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, red, error, className, requiredMark, disabled }: { label: string; value: string; onChange: (v: string)=>void; red?: boolean; error?: boolean; className?: string; requiredMark?: boolean; disabled?: boolean }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-700">
        <span>{label}</span>
        {requiredMark && (
          <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold align-middle ${error ? 'border-red-300 bg-red-100 text-red-700' : 'border-emerald-300 bg-emerald-100 text-emerald-700'}`}>
            Obrigatório
          </span>
        )}
      </label>
      <textarea
        value={value}
        onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
        disabled={disabled}
        className={`min-h-[88px] w-full rounded-lg border px-3 py-2 text-sm outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-emerald-700'} placeholder:text-emerald-600 placeholder:opacity-60 ${error || red ? 'border-red-500 bg-red-500/10 focus:ring-2 focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500'}`}
        placeholder=""
      />
    </div>
  );
}

type Opt = string | { label: string; value: string; disabled?: boolean };
function Select({ label, value, onChange, options, error, requiredMark, disabled }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[]; error?: boolean; requiredMark?: boolean; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">
        <span>{label}</span>
        {requiredMark && (
          <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold align-middle ${error ? 'border-red-300 bg-red-100 text-red-700' : 'border-emerald-300 bg-emerald-100 text-emerald-700'}`}>
            Obrigatório
          </span>
        )}
      </label>
      {(() => {
        const norm = options.map((opt) => (typeof opt === 'string' ? { label: opt, value: opt, disabled: false } : opt));
        const first = norm.find((o) => !o.disabled);
        const hasValue = norm.some((o) => o.value === value);
        const displayValue = disabled ? value : (hasValue ? value : (first?.value ?? ''));
        return (
          <select
            value={displayValue}
            onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
            disabled={disabled}
            className={`h-10 w-full rounded-lg border px-3 text-sm outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-emerald-700'} ${error ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500'}`}
          >
            {norm.map((opt, idx) => (
              <option key={opt.value+idx} value={opt.value} disabled={!!opt.disabled}>{opt.label}</option>
            ))}
          </select>
        );
      })()}
    </div>
  );
}

// (Removido) Segmented control; categorias agora ficam dentro do dropdown
