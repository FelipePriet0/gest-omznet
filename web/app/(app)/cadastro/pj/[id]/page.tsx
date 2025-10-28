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
  venc?: string | number | null;
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
};

type PjModel = {
  data_abertura?: string;
  nome_fantasia?: string;
  nome_fachada?: string;
  area_atuacao?: string;
  tipo_imovel?: string;
  obs_tipo_imovel?: string;
  tempo_endereco?: string;
  tipo_estabelecimento?: string;
  obs_estabelecimento?: string;
  end_ps?: string;
  fones_ps?: string;
  enviou_comprovante?: string | boolean | null;
  tipo_comprovante?: string;
  nome_comprovante?: string;
  contrato_social?: string | boolean | null;
  obs_contrato_social?: string;
  possui_internet?: string | boolean | null;
  operadora_internet?: string;
  plano_internet?: string;
  valor_internet?: string;
  socio1_nome?: string; socio1_cpf?: string; socio1_telefone?: string;
  socio2_nome?: string; socio2_cpf?: string; socio2_telefone?: string;
  socio3_nome?: string; socio3_cpf?: string; socio3_telefone?: string;
};

function digitsOnly(s: string) { return (s || "").replace(/\D+/g, ""); }
function maskPhone(input: string) {
  const d = digitsOnly(input).slice(0, 11);
  const len = d.length; const ddd = d.slice(0,2);
  if (len <= 2) return d;
  if (len <= 6) return `(${ddd}) ${d.slice(2)}`;
  if (len <= 10) return `(${ddd}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${ddd}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function maskPhoneLoose(input: string) {
  if (/[A-Za-z]/.test(input)) return input;
  return maskPhone(input);
}
function formatCurrencyBR(input: string) {
  const d = digitsOnly(input);
  if (!d) return "";
  let n = d.replace(/^0+/, '');
  if (n.length === 0) n = '0';
  let intRaw = '0';
  let cents = '00';
  if (n.length <= 2) { cents = n.padStart(2,'0'); intRaw = '0'; }
  else { intRaw = n.slice(0,-2); cents = n.slice(-2); }
  const intWithSep = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${intWithSep},${cents}`;
}
function formatCep(input: string) {
  const d = digitsOnly(input).slice(0,8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5)}`;
}
function formatCnpj(input: string) {
  const d = digitsOnly(input).slice(0, 14);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 8);
  const p4 = d.slice(8, 12);
  const p5 = d.slice(12, 14);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "/" + p4;
  if (p5) out += "-" + p5;
  return out;
}
function formatDateBR(input: string) {
  const d = digitsOnly(input).slice(0, 8); // DDMMYYYY
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 4);
  const p3 = d.slice(4, 8);
  let out = p1;
  if (p2) out += "/" + p2;
  if (p3) out += "/" + p3;
  return out;
}

// UI <-> canônico helpers (reuso de PF)
function uiToBool(v: any): boolean|null { if (v === 'Sim') return true; if (v === 'Não') return false; return null; }
function boolToUI(b: any): string { return b === true ? 'Sim' : b === false ? 'Não' : ''; }

const MEIO_UI = ['Ligação','Whatspp','Presensicial','Whats - Uber'] as const;
function uiToMeio(v:string): string|null { const m:any={ 'Ligação':'ligacao','Whatspp':'whatsapp','Presensicial':'presencial','Whats - Uber':'whats_uber' }; return m[v] ?? null; }
function meioToUI(v:string|null): string { const m:any={ ligacao:'Ligação',whatsapp:'Whatspp',presencial:'Presensicial',whats_uber:'Whats - Uber' }; return v ? (m[v] ?? '') : ''; }

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

// Enums (UI <-> canônico) para PJ
const TIPO_IMOVEL_UI = ['Comércio Terreo','Comércio Sala','Casa'] as const;
function uiToTipoImovel(v:string): string|null { const m:any={ 'Comércio Terreo':'comercio_terreo','Comércio Sala':'comercio_sala','Casa':'casa' }; return m[v] ?? null; }
function tipoImovelToUI(v:string|null): string { const m:any={ comercio_terreo:'Comércio Terreo', comercio_sala:'Comércio Sala', casa:'Casa' }; return v ? (m[v] ?? '') : ''; }

const TIPO_ESTAB_UI = ['Própria','Alugada','Cedida','Outros'] as const;
function uiToTipoEstab(v:string): string|null { const m:any={ 'Própria':'propria','Alugada':'alugada','Cedida':'cedida','Outros':'outros' }; return m[v] ?? null; }
function tipoEstabToUI(v:string|null): string { const m:any={ propria:'Própria', alugada:'Alugada', cedida:'Cedida', outros:'Outros' }; return v ? (m[v] ?? '') : ''; }

const TIPO_COMPROV_UI = ['Energia','Agua','Internet','Outro'] as const;
function uiToTipoComprov(v:string): string|null { const m:any={ Energia:'energia',Agua:'agua',Internet:'internet',Outro:'outro' }; return m[v] ?? null; }
function tipoComprovToUI(v:string|null): string { const m:any={ energia:'Energia',agua:'Agua',internet:'Internet',outro:'Outro' }; return v ? (m[v] ?? '') : ''; }

export default function CadastroPJPage() {
  const params = useParams();
  const applicantId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [app, setApp] = useState<AppModel>({});
  const [pj, setPj] = useState<PjModel>({});
  const timer = useRef<NodeJS.Timeout | null>(null);
  const pendingApp = useRef<Partial<AppModel>>({});
  const pendingPj = useRef<Partial<PjModel>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || null;
        // applicants
        const { data: a } = await supabase
          .from('applicants')
          .select('primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, quem_solicitou, telefone_solicitante, protocolo_mk, meio, info_spc, info_pesquisador, info_relevantes, info_mk')
          .eq('id', applicantId)
          .single();
        if (!active) return;
        const a2:any = { ...(a||{}) };
        if (a2 && typeof a2.meio !== 'undefined' && a2.meio !== null) a2.meio = meioToUI(a2.meio);
        if (a2 && typeof a2.venc !== 'undefined' && a2.venc !== null) a2.venc = String(a2.venc);
        setApp(a2||{});

        // pj_fichas
        let { data: p } = await supabase
          .from('pj_fichas')
          .select('*')
          .eq('applicant_id', applicantId)
          .maybeSingle();
        if (!p) {
          await supabase.from('pj_fichas').insert({ applicant_id: applicantId });
          const { data: p2 } = await supabase.from('pj_fichas').select('*').eq('applicant_id', applicantId).maybeSingle();
          p = p2 || null;
        }
        if (!active) return;
        const pfix:any = { ...(p as any) };
        // booleans to UI Sim/Não
        ['enviou_comprovante','possui_internet','contrato_social'].forEach((k:any)=>{
          if (k in pfix && pfix[k] !== null && typeof pfix[k] !== 'string') {
            pfix[k] = boolToUI(pfix[k]);
          }
        });
        // Enums to UI labels
        if (typeof pfix.tipo_imovel !== 'undefined') pfix.tipo_imovel = tipoImovelToUI(pfix.tipo_imovel as any);
        if (typeof pfix.tipo_estabelecimento !== 'undefined') pfix.tipo_estabelecimento = tipoEstabToUI(pfix.tipo_estabelecimento as any);
        if (typeof pfix.tipo_comprovante !== 'undefined') pfix.tipo_comprovante = tipoComprovToUI(pfix.tipo_comprovante as any);
        setPj(pfix||{});

        // Garantir card no Kanban (Comercial/Cadastrar no MK)
        if (userId) {
          const { data: existing } = await supabase
            .from('kanban_cards')
            .select('id')
            .eq('applicant_id', applicantId)
            .is('deleted_at', null)
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from('kanban_cards').insert({
              applicant_id: applicantId,
              person_type: 'PJ',
              area: 'comercial',
              stage: 'feitas',
              created_by: userId,
            });
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [applicantId]);

  // Realtime: applicants + pj_fichas
  useEffect(() => {
    let ch1:any; let ch2:any;
    try {
      ch1 = supabase
        .channel(`rt-pj-app-${applicantId}`)
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'applicants', filter:`id=eq.${applicantId}` }, (payload:any) => {
          const a = payload.new || {};
          const a2:any = { ...(app||{}) };
          Object.assign(a2, a);
          if (a2 && typeof a2.meio !== 'undefined' && a2.meio !== null) a2.meio = meioToUI(a2.meio);
          if (a2 && typeof a2.venc !== 'undefined' && a2.venc !== null) a2.venc = String(a2.venc);
          setApp(a2);
        })
        .subscribe();
      ch2 = supabase
        .channel(`rt-pj-fichas-${applicantId}`)
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'pj_fichas', filter:`applicant_id=eq.${applicantId}` }, (payload:any) => {
          const p = payload.new || {};
          const p2:any = { ...(pj||{}), ...p };
          // Booleans → UI
          ['enviou_comprovante','possui_internet','contrato_social'].forEach((k:any)=>{
            if (k in p2 && typeof p2[k] !== 'string') p2[k] = boolToUI(p2[k]);
          });
          // Enums: map canônico → UI
          if (typeof p2.tipo_imovel !== 'undefined') p2.tipo_imovel = tipoImovelToUI(p2.tipo_imovel as any);
          if (typeof p2.tipo_estabelecimento !== 'undefined') p2.tipo_estabelecimento = tipoEstabToUI(p2.tipo_estabelecimento as any);
          if (typeof p2.tipo_comprovante !== 'undefined') p2.tipo_comprovante = tipoComprovToUI(p2.tipo_comprovante as any);
          setPj(p2);
        })
        .subscribe();
    } catch {}
    return () => { try { if (ch1) supabase.removeChannel(ch1); if (ch2) supabase.removeChannel(ch2); } catch {} };
  }, [applicantId]);

  async function flushAutosave() {
    if (!applicantId) return;
    const appPayload = pendingApp.current; const pjPayload = pendingPj.current;
    pendingApp.current = {}; pendingPj.current = {};
    if (Object.keys(appPayload).length === 0 && Object.keys(pjPayload).length === 0) return;
    setSaving('saving');
    try {
      if (Object.keys(appPayload).length > 0) {
        const ap:any = { ...appPayload };
        if (typeof ap.meio !== 'undefined') ap.meio = uiToMeio(String(ap.meio));
        if (typeof ap.venc !== 'undefined') { const n = parseInt(String(ap.venc),10); ap.venc = Number.isFinite(n) ? n : null; }
        await supabase.from('applicants').update(ap).eq('id', applicantId);
      }
      if (Object.keys(pjPayload).length > 0) {
        const pp:any = { ...pjPayload };
        // booleans UI → canônico
        ['enviou_comprovante','possui_internet','contrato_social'].forEach((k:any)=>{
          if (typeof pp[k] !== 'undefined') { const b = uiToBool(String(pp[k])); pp[k] = (b===null? null : b); }
        });
        // enums UI → canônico
        if (typeof pp.tipo_imovel !== 'undefined') pp.tipo_imovel = uiToTipoImovel(String(pp.tipo_imovel));
        if (typeof pp.tipo_estabelecimento !== 'undefined') pp.tipo_estabelecimento = uiToTipoEstab(String(pp.tipo_estabelecimento));
        if (typeof pp.tipo_comprovante !== 'undefined') pp.tipo_comprovante = uiToTipoComprov(String(pp.tipo_comprovante));
        await supabase.from('pj_fichas').update(pp).eq('applicant_id', applicantId);
      }
      setSaving('saved'); setTimeout(()=> setSaving('idle'), 1200);
    } catch(e) { setSaving('error'); }
  }

  function queueSave(scope:'app'|'pj', key:string, value:any) {
    if (scope==='app') pendingApp.current = { ...pendingApp.current, [key]: value };
    else pendingPj.current = { ...pendingPj.current, [key]: value };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flushAutosave, 700);
  }

  const statusText = useMemo(() => (saving==='saving' ? 'Salvando…' : saving==='saved' ? 'Salvo' : saving==='error' ? 'Erro ao salvar' : ''), [saving]);

  function onDownloadPdf() { try{ window.print(); } catch{} }
  function onClosePage() { try{ window.close(); } catch{} try{ history.back(); } catch{} }

  if (loading) return <div className="p-4 text-sm text-zinc-600">Carregando…</div>;

  const reqComprov = (pj.enviou_comprovante||'') === 'Sim';

  return (
    <div className="pj-form p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Ficha PJ — Expanded</h1>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-600">{statusText}</div>
          <button onClick={onDownloadPdf} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Baixar PDF</button>
          <button onClick={onClosePage} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Fechar</button>
        </div>
      </div>

      {/* Seção 1: Dados da Empresa */}
      <Card title="Dados da Empresa">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Razão Social" value={app.primary_name||''} onChange={(v)=>{ setApp({...app, primary_name:v}); queueSave('app','primary_name',v); }} className="lg:col-span-2" />
          <Field label="CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCnpj(v); setApp({...app, cpf_cnpj:m}); queueSave('app','cpf_cnpj',m); }} inputMode="numeric" maxLength={18} />
          <Field label="Data de Abertura" value={pj.data_abertura||''} onChange={(v)=>{ const m=formatDateBR(v); setPj({...pj, data_abertura:m}); queueSave('pj','data_abertura', m); }} inputMode="numeric" maxLength={10} />
          <Field label="Nome Fantasia" value={pj.nome_fantasia||''} onChange={(v)=>{ setPj({...pj, nome_fantasia:v}); queueSave('pj','nome_fantasia', v); }} />
          <Field label="Nome de Fachada" value={pj.nome_fachada||''} onChange={(v)=>{ setPj({...pj, nome_fachada:v}); queueSave('pj','nome_fachada', v); }} />
          <Field label="Área de Atuação" value={pj.area_atuacao||''} onChange={(v)=>{ setPj({...pj, area_atuacao:v}); queueSave('pj','area_atuacao', v); }} />
        </div>
      </Card>

      {/* Seção 2: Endereço */}
      <Card title="Endereço">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Endereço" value={app.address_line||''} onChange={(v)=>{ setApp({...app, address_line:v}); queueSave('app','address_line', v); }} className="md:col-span-2" />
          <Field label="Número" value={app.address_number||''} onChange={(v)=>{ setApp({...app, address_number:v}); queueSave('app','address_number', v); }} />
          <Field label="Complemento" value={app.address_complement||''} onChange={(v)=>{ setApp({...app, address_complement:v}); queueSave('app','address_complement', v); }} />
          <Field label="CEP" value={app.cep||''} onChange={(v)=>{ const m = formatCep(v); setApp({...app, cep:m}); queueSave('app','cep', m); }} />
          <Field label="Bairro" value={app.bairro||''} onChange={(v)=>{ setApp({...app, bairro:v}); queueSave('app','bairro', v); }} />
          <Select label="Tipo de Imóvel" value={pj.tipo_imovel||''} onChange={(v)=>{ setPj({...pj, tipo_imovel:v}); queueSave('pj','tipo_imovel', v); }} options={["Comércio Terreo","Comércio Sala","Casa"]} />
          <Field label="Obs Tipo de Imóvel" value={pj.obs_tipo_imovel||''} onChange={(v)=>{ setPj({...pj, obs_tipo_imovel:v}); queueSave('pj','obs_tipo_imovel', v); }} />
          <Field label="Tempo no Endereço" value={pj.tempo_endereco||''} onChange={(v)=>{ setPj({...pj, tempo_endereco:v}); queueSave('pj','tempo_endereco', v); }} />
          <Select label="Tipo de Estabelecimento" value={pj.tipo_estabelecimento||''} onChange={(v)=>{ setPj({...pj, tipo_estabelecimento:v}); queueSave('pj','tipo_estabelecimento', v); }} options={["Própria","Alugada","Cedida","Outros"]} />
          <Field label="Obs Estabelecimento" value={pj.obs_estabelecimento||''} onChange={(v)=>{ setPj({...pj, obs_estabelecimento:v}); queueSave('pj','obs_estabelecimento', v); }} />
          <Field label="Endereço do PS" value={pj.end_ps||''} onChange={(v)=>{ setPj({...pj, end_ps:v}); queueSave('pj','end_ps', v); }} red className="md:col-span-3" />
        </div>
      </Card>

      {/* Seção 3: Contatos e Documentos */}
      <Card title="Contatos e Documentos">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Telefone" value={app.phone||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, phone:m}); queueSave('app','phone', m); }} />
          <Field label="WhatsApp" value={app.whatsapp||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, whatsapp:m}); queueSave('app','whatsapp', m); }} />
          <Field label="Fones no PS" value={pj.fones_ps||''} onChange={(v)=>{ setPj({...pj, fones_ps:v}); queueSave('pj','fones_ps', v); }} red />
          <Field label="E-mail" value={app.email||''} onChange={(v)=>{ setApp({...app, email:v}); queueSave('app','email', v); }} className="md:col-span-3" />
          <Select label="Enviou Comprovante" value={pj.enviou_comprovante as any || ''} onChange={(v)=>{ setPj({...pj, enviou_comprovante:v}); queueSave('pj','enviou_comprovante', v); if (v==='Não'){ setPj(prev=>({ ...prev, tipo_comprovante:'', nome_comprovante:'' })); queueSave('pj','tipo_comprovante',''); queueSave('pj','nome_comprovante',''); } }} options={["Sim","Não"]} />
          <Select label="Tipo de Comprovante" value={pj.tipo_comprovante||''} onChange={(v)=>{ setPj({...pj, tipo_comprovante:v}); queueSave('pj','tipo_comprovante', v); }} options={["Energia","Agua","Internet","Outro"]} disabled={!reqComprov} requiredMark={reqComprov} />
          <Field label="Em nome de" value={pj.nome_comprovante||''} onChange={(v)=>{ setPj({...pj, nome_comprovante:v}); queueSave('pj','nome_comprovante', v); }} disabled={!reqComprov} requiredMark={reqComprov} />
          <Select label="Possui Internet" value={pj.possui_internet as any || ''} onChange={(v)=>{ setPj({...pj, possui_internet:v}); queueSave('pj','possui_internet', v); }} options={["Sim","Não"]} />
          <Field label="Operadora Internet" value={pj.operadora_internet||''} onChange={(v)=>{ setPj({...pj, operadora_internet:v}); queueSave('pj','operadora_internet', v); }} />
          <Field label="Plano Internet" value={pj.plano_internet||''} onChange={(v)=>{ setPj({...pj, plano_internet:v}); queueSave('pj','plano_internet', v); }} />
          <Field label="Valor Internet" value={pj.valor_internet||''} onChange={(v)=>{ const m = formatCurrencyBR(v); setPj({...pj, valor_internet:m}); queueSave('pj','valor_internet', m); }} />
          <Select label="Contrato Social" value={pj.contrato_social as any || ''} onChange={(v)=>{ setPj({...pj, contrato_social:v}); queueSave('pj','contrato_social', v); }} options={["Sim","Não"]} className="md:col-span-2" />
          <Field label="Observações" value={pj.obs_contrato_social||''} onChange={(v)=>{ setPj({...pj, obs_contrato_social:v}); queueSave('pj','obs_contrato_social', v); }} />
        </div>
      </Card>

      {/* Seção 4: Sócios */}
      <Card title="Sócios">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Sócio 1 - Nome" value={pj.socio1_nome||''} onChange={(v)=>{ setPj({...pj, socio1_nome:v}); queueSave('pj','socio1_nome', v); }} />
          <Field label="Sócio 1 - CPF" value={pj.socio1_cpf||''} onChange={(v)=>{ setPj({...pj, socio1_cpf:v}); queueSave('pj','socio1_cpf', v); }} />
          <Field label="Sócio 1 - Tel" value={pj.socio1_telefone||''} onChange={(v)=>{ setPj({...pj, socio1_telefone:v}); queueSave('pj','socio1_telefone', v); }} />
          <Field label="Sócio 2 - Nome" value={pj.socio2_nome||''} onChange={(v)=>{ setPj({...pj, socio2_nome:v}); queueSave('pj','socio2_nome', v); }} />
          <Field label="Sócio 2 - CPF" value={pj.socio2_cpf||''} onChange={(v)=>{ setPj({...pj, socio2_cpf:v}); queueSave('pj','socio2_cpf', v); }} />
          <Field label="Sócio 2 - Tel" value={pj.socio2_telefone||''} onChange={(v)=>{ setPj({...pj, socio2_telefone:v}); queueSave('pj','socio2_telefone', v); }} />
          <Field label="Sócio 3 - Nome" value={pj.socio3_nome||''} onChange={(v)=>{ setPj({...pj, socio3_nome:v}); queueSave('pj','socio3_nome', v); }} />
          <Field label="Sócio 3 - CPF" value={pj.socio3_cpf||''} onChange={(v)=>{ setPj({...pj, socio3_cpf:v}); queueSave('pj','socio3_cpf', v); }} />
          <Field label="Sócio 3 - Tel" value={pj.socio3_telefone||''} onChange={(v)=>{ setPj({...pj, socio3_telefone:v}); queueSave('pj','socio3_telefone', v); }} />
        </div>
      </Card>

      {/* Seção 5: Solicitação */}
      <Card title="Solicitação">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Quem Solicitou" value={app.quem_solicitou||''} onChange={(v)=>{ setApp({...app, quem_solicitou:v}); queueSave('app','quem_solicitou', v); }} />
          <Select label="Meio" value={app.meio||''} onChange={(v)=>{ setApp({...app, meio:v}); queueSave('app','meio', v); }} options={[...MEIO_UI]} />
          <Field label="Tel" value={app.telefone_solicitante||''} onChange={(v)=>{ const m=maskPhone(v); setApp({...app, telefone_solicitante:m}); queueSave('app','telefone_solicitante', m); }} />
          <Field label="Protocolo MK" value={app.protocolo_mk||''} onChange={(v)=>{ setApp({...app, protocolo_mk:v}); queueSave('app','protocolo_mk', v); }} />
          <Select label="Plano de Acesso" value={app.plano_acesso||''} onChange={(v)=>{ setApp({...app, plano_acesso:v}); queueSave('app','plano_acesso', v); }} options={PLANO_OPTIONS as any} />
          <Select label="SVA Avulso" value={app.sva_avulso||''} onChange={(v)=>{ setApp({...app, sva_avulso:v}); queueSave('app','sva_avulso', v); }} options={SVA_OPTIONS as any} />
          <Select label="Vencimento" value={String(app.venc||'')} onChange={(v)=>{ setApp({...app, venc:v}); queueSave('app','venc', v); }} options={["5","10","15","20","25"]} />
          <Select label="Carnê Impresso" value={app.carne_impresso ? 'Sim':'Não'} onChange={(v)=>{ const val = (v==='Sim'); setApp({...app, carne_impresso:val}); queueSave('app','carne_impresso', val); }} options={["Sim","Não"]} />
        </div>
      </Card>

      {/* Seção 6: Informações Relevantes da Solicitação */}
      <Card title="Informações Relevantes da Solicitação">
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Informações relevantes da solicitação" value={app.info_relevantes||''} onChange={(v)=>{ setApp({...app, info_relevantes:v}); queueSave('app','info_relevantes', v); }} />
        </div>
      </Card>

      {/* Seção 7: Consulta SPC/SERASA */}
      <Card title="Consulta SPC/Serasa">
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Consulta SPC/Serasa" value={app.info_spc||''} onChange={(v)=>{ setApp({...app, info_spc:v}); queueSave('app','info_spc', v); }} red />
        </div>
      </Card>

      {/* Seção 8: Outras Informações Relevantes do PS */}
      <Card title="Outras Informações Relevantes do PS">
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Outras informações relevantes do PS" value={app.info_pesquisador||''} onChange={(v)=>{ setApp({...app, info_pesquisador:v}); queueSave('app','info_pesquisador', v); }} red />
        </div>
      </Card>

      {/* Seção 9: Informações Relevantes do MK */}
      <Card title="Informações Relevantes do MK">
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Informações Relevantes do MK" value={app.info_mk||''} onChange={(v)=>{ setApp({...app, info_mk:v}); queueSave('app','info_mk', v); }} red />
        </div>
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

function Field({ label, value, onChange, className, red, disabled, maxLength, inputMode }: { label: string; value: string; onChange: (v:string)=>void; className?: string; red?: boolean; disabled?: boolean; maxLength?: number; inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-emerald-700'} placeholder:text-emerald-600 placeholder:opacity-60 ${red ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-2 focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500'}`}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, red }: { label: string; value: string; onChange: (v:string)=>void; red?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(e)=> onChange(e.target.value)}
        className={`min-h-[88px] w-full rounded-lg border px-3 py-2 text-sm outline-none text-emerald-700 placeholder:text-emerald-600 placeholder:opacity-60 ${red ? 'border-red-500 bg-red-500/10 focus:ring-2 focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500'}`}
      />
    </div>
  );
}

type Opt = string | { label: string; value: string; disabled?: boolean };
function Select({ label, value, onChange, options, disabled, className, requiredMark }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[]; disabled?: boolean; className?: string; requiredMark?: boolean }) {
  const norm = options.map((opt) => (typeof opt === 'string' ? { label: opt, value: opt, disabled: false } : opt));
  const first = norm.find((o) => !o.disabled);
  const hasValue = norm.some((o) => o.value === value);
  const displayValue = disabled ? value : (hasValue ? value : (first?.value ?? ''));
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-700">
        <span>{label}</span>
        {requiredMark && (
          <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold align-middle ${disabled ? 'border-gray-300 bg-gray-100 text-gray-500' : 'border-emerald-300 bg-emerald-100 text-emerald-700'}`}>
            Obrigatório
          </span>
        )}
      </label>
      <select
        value={displayValue}
        onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
        disabled={disabled}
        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-emerald-700'} border-gray-300 focus:border-emerald-500`}
      >
        {norm.map((opt, idx) => (
          <option key={opt.value+idx} value={opt.value} disabled={!!opt.disabled}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
