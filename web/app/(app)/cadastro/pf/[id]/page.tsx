"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SimpleSelect } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { Textarea as UITTextarea } from "@/components/ui/textarea";
import { Search, CheckCircle, XCircle, RefreshCcw, ClipboardList, Paperclip, User as UserIcon, ArrowRight, Pin } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { changeStage } from "@/features/kanban/services";
import { listProfiles, type ProfileLite } from "@/features/comments/services";
import { TaskDrawer } from "@/features/tasks/TaskDrawer";
import { AttachmentsModal } from "@/features/attachments/AttachmentsModal";

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
  idade?: string;
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
  conjuge_idade?: string | null;
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
// Mapeamentos UI <-> Canônico (após migration)
const BOOL_UI = { Sim: true, Não: false } as const;
function uiToBool(v: any): boolean|null { if (v === 'Sim') return true; if (v === 'Não') return false; return null; }
function boolToUI(b: any): string { return b === true ? 'Sim' : b === false ? 'Não' : ''; }

const TIPO_MORADIA_UI = ['Própria','Alugada','Cedida','Outros'] as const;
function uiToTipoMoradia(v: string): string|null { const m: any = { 'Própria':'propria','Alugada':'alugada','Cedida':'cedida','Outros':'outros' }; return m[v] ?? null; }
function tipoMoradiaToUI(v: string|null): string { const m: any = { propria:'Própria', alugada:'Alugada', cedida:'Cedida', outros:'Outros' }; return v ? (m[v] ?? '') : ''; }

const NAS_OUTRAS_UI = ['Parentes','Locador(a)','Só conhecidos','Não conhece'] as const;
function uiToNasOutras(v: string): string|null { const m:any={ 'Parentes':'parentes','Locador(a)':'locador','Só conhecidos':'so_conhecidos','Não conhece':'nao_conhece' }; return m[v] ?? null; }
function nasOutrasToUI(v: string|null): string { const m:any={ parentes:'Parentes',locador:'Locador(a)','so_conhecidos':'Só conhecidos','nao_conhece':'Não conhece' }; return v ? (m[v] ?? '') : ''; }

const TIPO_COMPROV_UI = ['Energia','Agua','Internet','Outro'] as const;
function uiToTipoComprov(v:string): string|null { const m:any={ Energia:'energia',Agua:'agua',Internet:'internet',Outro:'outro' }; return m[v] ?? null; }
function tipoComprovToUI(v:string|null): string { const m:any={ energia:'Energia',agua:'Agua',internet:'Internet',outro:'Outro' }; return v ? (m[v] ?? '') : ''; }

const VINCULO_UI = ['Carteira Assinada','Presta Serviços','Contrato de Trabalho','Autonômo','Concursado','Outro'] as const;
function uiToVinculo(v:string): string|null { const m:any={ 'Carteira Assinada':'carteira_assinada','Presta Serviços':'presta_servicos','Contrato de Trabalho':'contrato_trabalho','Autonômo':'autonomo','Concursado':'concursado','Outro':'outro' }; return m[v] ?? null; }
function vinculoToUI(v:string|null): string { const m:any={ carteira_assinada:'Carteira Assinada',presta_servicos:'Presta Serviços',contrato_trabalho:'Contrato de Trabalho',autonomo:'Autonômo',concursado:'Concursado',outro:'Outro' }; return v ? (m[v] ?? '') : ''; }

const ESTADO_CIVIL_UI = ['Solteiro(a)','Casado(a)','Amasiado(a)','Separado(a)','Viuvo(a)'] as const;
function uiToEstadoCivil(v:string): string|null { const m:any={ 'Solteiro(a)':'solteiro','Casado(a)':'casado','Amasiado(a)':'amasiado','Separado(a)':'separado','Viuvo(a)':'viuvo' }; return m[v] ?? null; }
function estadoCivilToUI(v:string|null): string { const m:any={ solteiro:'Solteiro(a)',casado:'Casado(a)',amasiado:'Amasiado(a)',separado:'Separado(a)',viuvo:'Viuvo(a)' }; return v ? (m[v] ?? '') : ''; }

const MEIO_UI = ['Ligação','Whatspp','Presensicial','Whats - Uber'] as const;
function uiToMeio(v:string): string|null { const m:any={ 'Ligação':'ligacao','Whatspp':'whatsapp','Presensicial':'presencial','Whats - Uber':'whats_uber' }; return m[v] ?? null; }
function meioToUI(v:string|null): string { const m:any={ ligacao:'Ligação',whatsapp:'Whatspp',presencial:'Presensicial',whats_uber:'Whats - Uber' }; return v ? (m[v] ?? '') : ''; }
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
function formatCep(input: string) {
  const d = digitsOnly(input).slice(0,8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5)}`;
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
  const search = useSearchParams();
  const from = (search?.get('from') || '').toLowerCase();
  const [cardIdEff, setCardIdEff] = useState<string>('');
  const showAnalyzeCrumb = from === 'analisar';
  // Parecer states
  const [pareceres, setPareceres] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [novoParecer, setNovoParecer] = useState("");
  const [mentionOpenParecer, setMentionOpenParecer] = useState(false);
  const [mentionFilterParecer, setMentionFilterParecer] = useState("");
  const [cmdOpenParecer, setCmdOpenParecer] = useState(false);
  const [cmdQueryParecer, setCmdQueryParecer] = useState("");
  const [cmdAnchorParecer, setCmdAnchorParecer] = useState<{top:number;left:number}>({ top: 0, left: 0 });
  const parecerRef = useRef<HTMLTextAreaElement|null>(null);
  const [taskOpen, setTaskOpen] = useState<{open:boolean, parentId?: string|null, taskId?: string|null, source?: 'parecer'|'conversa'}>({open:false});
  const [attachOpen, setAttachOpen] = useState<{open:boolean, parentId?: string|null, source?: 'parecer'|'conversa'}>({open:false});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        // ensure auth
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || null;
        // Load applicants
        const { data: a, error: errA } = await supabase
          .from("applicants")
          .select("primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, quem_solicitou, telefone_solicitante, protocolo_mk, meio, info_spc, info_pesquisador, info_relevantes, info_mk, parecer_analise")
          .eq("id", applicantId)
          .single();
        if (!active) return;
        const a2: any = { ...(a||{}) };
        if (a2 && typeof a2.meio !== 'undefined' && a2.meio !== null) a2.meio = meioToUI(a2.meio);
        if (a2 && typeof a2.venc !== 'undefined' && a2.venc !== null) a2.venc = String(a2.venc);
        setApp(a2 || {});

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
        if (typeof pfix?.idade !== 'undefined' && pfix.idade !== null) {
          pfix.idade = String(pfix.idade);
        }
        if (typeof pfix?.conjuge_idade !== 'undefined' && pfix.conjuge_idade !== null) {
          pfix.conjuge_idade = String(pfix.conjuge_idade);
        }
        // Booleans → UI Sim/Não
        ['tem_contrato','enviou_contrato','enviou_comprovante','tem_internet_fixa'].forEach((k:any) => {
          if (k in pfix && (pfix as any)[k] !== null && typeof (pfix as any)[k] !== 'string') {
            (pfix as any)[k] = boolToUI((pfix as any)[k]);
          }
        });
        // Enums → UI labels
        if (typeof pfix.tipo_moradia !== 'undefined') pfix.tipo_moradia = tipoMoradiaToUI(pfix.tipo_moradia as any);
        if (typeof pfix.nas_outras !== 'undefined') pfix.nas_outras = nasOutrasToUI(pfix.nas_outras as any);
        if (typeof pfix.tipo_comprovante !== 'undefined') pfix.tipo_comprovante = tipoComprovToUI(pfix.tipo_comprovante as any);
        if (typeof pfix.vinculo !== 'undefined') pfix.vinculo = vinculoToUI(pfix.vinculo as any);
        if (typeof pfix.estado_civil !== 'undefined') pfix.estado_civil = estadoCivilToUI(pfix.estado_civil as any);
        setPf(pfix || {});

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
              person_type: 'PF',
              area: 'comercial',
              stage: 'feitas',
              created_by: userId,
            });
          }
        }

        // Efetivar card pelo applicantId (triangulação)
        const { data: cardRow } = await supabase
          .from('kanban_cards')
          .select('id, reanalysis_notes')
          .eq('applicant_id', applicantId)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const useCardId = (cardRow as any)?.id || null;
        if (useCardId) {
          setCardIdEff(useCardId);
          if (Array.isArray((cardRow as any).reanalysis_notes)) setPareceres((cardRow as any).reanalysis_notes);
        }
        try { setProfiles(await listProfiles()); } catch {}
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [applicantId]);

  // Realtime: applicants + pf_fichas + kanban_cards (pareceres via triangulação)
  useEffect(() => {
    let ch1:any; let ch2:any; let ch3:any;
    try {
      ch1 = supabase
        .channel(`rt-pf-app-${applicantId}`)
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
        .channel(`rt-pf-fichas-${applicantId}`)
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'pf_fichas', filter:`applicant_id=eq.${applicantId}` }, (payload:any) => {
          const p = payload.new || {};
          const pfix:any = { ...(pf||{}), ...p };
          if (pfix && pfix.birth_date) pfix.birth_date = isoToBR(pfix.birth_date);
          if (typeof pfix?.idade !== 'undefined' && pfix.idade !== null) pfix.idade = String(pfix.idade);
          if (typeof pfix?.conjuge_idade !== 'undefined' && pfix.conjuge_idade !== null) pfix.conjuge_idade = String(pfix.conjuge_idade);
          // Booleans → UI
          ['tem_contrato','enviou_contrato','enviou_comprovante','tem_internet_fixa','unica_no_lote'].forEach((k:any)=>{
            if (k in pfix && typeof pfix[k] !== 'string') pfix[k] = boolToUI(pfix[k]);
          });
          // Enums → UI
          if (typeof pfix.tipo_moradia !== 'undefined') pfix.tipo_moradia = tipoMoradiaToUI(pfix.tipo_moradia as any);
          if (typeof pfix.nas_outras !== 'undefined') pfix.nas_outras = nasOutrasToUI(pfix.nas_outras as any);
          if (typeof pfix.tipo_comprovante !== 'undefined') pfix.tipo_comprovante = tipoComprovToUI(pfix.tipo_comprovante as any);
          if (typeof pfix.vinculo !== 'undefined') pfix.vinculo = vinculoToUI(pfix.vinculo as any);
          if (typeof pfix.estado_civil !== 'undefined') pfix.estado_civil = estadoCivilToUI(pfix.estado_civil as any);
          setPf(pfix);
        })
        .subscribe();
      if (cardIdEff) {
        ch3 = supabase
          .channel(`rt-pf-card-${cardIdEff}`)
          .on('postgres_changes', { event:'UPDATE', schema:'public', table:'kanban_cards', filter:`id=eq.${cardIdEff}` }, (payload:any) => {
            const row:any = payload.new || {};
            if (Array.isArray(row.reanalysis_notes)) setPareceres(row.reanalysis_notes);
          })
          .subscribe();
      }
    } catch {}
    return () => { try { if (ch1) supabase.removeChannel(ch1); if (ch2) supabase.removeChannel(ch2); if (ch3) supabase.removeChannel(ch3); } catch {} };
  }, [applicantId, cardIdEff]);

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
        const appPatch:any = { ...appPayload };
        if (typeof appPatch.meio !== 'undefined') {
          const canon = uiToMeio(String(appPatch.meio));
          appPatch.meio = canon;
        }
        if (typeof appPatch.venc !== 'undefined') {
          const n = parseInt(String(appPatch.venc),10);
          appPatch.venc = Number.isFinite(n) ? n : null;
        }
        await supabase.from("applicants").update(appPatch).eq("id", applicantId);
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
        // Outros booleans (UI → canônico)
        ['tem_contrato','enviou_contrato','enviou_comprovante','tem_internet_fixa'].forEach((k:any)=>{
          if (typeof patch[k] !== 'undefined') {
            const b = uiToBool(String(patch[k]));
            patch[k] = (b === null ? null : b);
          }
        });
        // Enums (UI → canônico)
        if (typeof patch.tipo_moradia !== 'undefined') patch.tipo_moradia = uiToTipoMoradia(String(patch.tipo_moradia));
        if (typeof patch.nas_outras !== 'undefined') patch.nas_outras = uiToNasOutras(String(patch.nas_outras));
        if (typeof patch.tipo_comprovante !== 'undefined') patch.tipo_comprovante = uiToTipoComprov(String(patch.tipo_comprovante));
        if (typeof patch.vinculo !== 'undefined') patch.vinculo = uiToVinculo(String(patch.vinculo));
        if (typeof patch.estado_civil !== 'undefined') patch.estado_civil = uiToEstadoCivil(String(patch.estado_civil));
        if (typeof patch.idade !== 'undefined') {
          const only = digitsOnly(String(patch.idade||''));
          patch.idade = only ? parseInt(only,10) : null;
        }
        if (typeof patch.conjuge_idade !== 'undefined') {
          const onlyc = digitsOnly(String(patch.conjuge_idade||''));
          patch.conjuge_idade = onlyc ? parseInt(onlyc,10) : null;
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
    { label: 'XXXXX', value: 'XXXXX' },
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

      {/* Seção 1: Dados do Cliente */}
      <Card title="Dados do Cliente">
        {/* Linha 1: Nome | CPF | Data de Nascimento | Idade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Nome do Cliente" value={app.primary_name || ""} onChange={(v)=>{ setApp({...app, primary_name:v}); queueSave("app","primary_name", v); }} />
          <Field label="CPF" value={app.cpf_cnpj || ""} onChange={(v)=>{ setApp({...app, cpf_cnpj:v}); queueSave("app","cpf_cnpj", v); }} />
          <Field label="Data de Nascimento" value={pf.birth_date ? formatDateBR(pf.birth_date as any) : ""} onChange={(v)=>{ setPf({...pf, birth_date: v}); queueSave("pf","birth_date", v); }} />
          <Field label="Idade" value={pf.idade || ""} onChange={(v)=>{ setPf({...pf, idade:v}); queueSave('pf','idade', v); }} maxLength={2} />
        </div>
        {/* Linha 2: Telefone | WhatsApp | Do PS */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Telefone" value={app.phone || ""} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, phone:m}); queueSave("app","phone", m); }} />
          <Field label="WhatsApp" value={app.whatsapp || ""} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, whatsapp:m}); queueSave("app","whatsapp", m); }} />
          <Textarea label="Do PS" value={pf.do_ps || ""} onChange={(v)=>{ setPf({...pf, do_ps:v}); queueSave("pf","do_ps", v); }} red />
        </div>
        {/* Linha 3: Naturalidade | UF | E-mail */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Naturalidade" value={pf.naturalidade || ""} onChange={(v)=>{ setPf({...pf, naturalidade:v}); queueSave("pf","naturalidade", v); }} />
          <Field label="UF" value={pf.uf_naturalidade || ""} onChange={(v)=>{ setPf({...pf, uf_naturalidade:v}); queueSave("pf","uf_naturalidade", v); }} />
          <Field label="E-mail" value={app.email || ""} onChange={(v)=>{ setApp({...app, email:v}); queueSave("app","email", v); }} />
        </div>
      </Card>

      {/* Seção 2: Endereço */}
      <Card title="Endereço">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Endereço" value={app.address_line || ""} onChange={(v)=>{ setApp({...app, address_line:v}); queueSave("app","address_line", v); }} className="col-span-2" />
          <Field label="Número" value={app.address_number || ""} onChange={(v)=>{ setApp({...app, address_number:v}); queueSave("app","address_number", v); }} />
          <Field label="Complemento" value={app.address_complement || ""} onChange={(v)=>{ setApp({...app, address_complement:v}); queueSave("app","address_complement", v); }} />
          <Field label="CEP" value={app.cep || ""} onChange={(v)=>{
            const m = formatCep(v);
            setApp({...app, cep:m});
            queueSave('app','cep', m);
          }} />
          <Field label="Bairro" value={app.bairro || ""} onChange={(v)=>{ setApp({...app, bairro:v}); queueSave("app","bairro", v); }} />
          <Field label="Cond" value={pf.cond || ""} onChange={(v)=>{ setPf({...pf, cond:v}); queueSave("pf","cond", v); }} />
          <Field label="Tempo" value={pf.tempo_endereco || ""} onChange={(v)=>{ setPf({...pf, tempo_endereco:v}); queueSave("pf","tempo_endereco", v); }} />
          <Field label="Endereço Do PS" value={pf.endereco_do_ps || ""} onChange={(v)=>{ setPf({...pf, endereco_do_ps:v}); queueSave("pf","endereco_do_ps", v); }} red className="md:col-span-4" />
        </div>
        {/* Checklist removido: agora marcamos no label dos campos obrigatórios */}
      </Card>

      {/* Seção 3: Relações de Residência */}
      <Card title="Relações de Residência">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Linha 1 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Tipo de Moradia</span>
            </label>
            <SimpleSelect
              value={pf.tipo_moradia || ""}
              onChange={(v)=>{ setPf({...pf, tipo_moradia:v}); queueSave("pf","tipo_moradia", v); }}
              options={["Própria","Alugada","Cedida","Outros"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Observações" value={pf.tipo_moradia_obs || ""} onChange={(v)=>{ setPf({...pf, tipo_moradia_obs:v}); queueSave("pf","tipo_moradia_obs", v); }} error={errs.tipo_moradia_obs} requiredMark={reqObs} className="md:col-span-2" />
          {/* Linha 2 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Única no lote</span>
            </label>
            <SimpleSelect
              value={pf.unica_no_lote || ""}
              onChange={(v)=>{ setPf({...pf, unica_no_lote:v}); queueSave("pf","unica_no_lote", v); }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Única no lote (Obs)" value={pf.unica_no_lote_obs || ""} onChange={(v)=>{ setPf({...pf, unica_no_lote_obs:v}); queueSave("pf","unica_no_lote_obs", v); }} error={errs.unica_no_lote_obs} requiredMark={reqUnicaObs} className="md:col-span-2" />
          {/* Linha 3 */}
          <Field label="Com quem reside" value={pf.com_quem_reside || ""} onChange={(v)=>{ setPf({...pf, com_quem_reside:v}); queueSave("pf","com_quem_reside", v); }} className="md:col-span-2" />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Nas outras</span>
            </label>
            <SimpleSelect
              value={pf.nas_outras || ""}
              onChange={(v)=>{ setPf({...pf, nas_outras:v}); queueSave("pf","nas_outras", v); }}
              options={["Parentes","Locador(a)","Só conhecidos","Não conhece"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          {/* Linha 4 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Tem Contrato</span>
            </label>
            <SimpleSelect
              value={pf.tem_contrato || ""}
              onChange={(v)=>{ setPf({...pf, tem_contrato:v}); queueSave("pf","tem_contrato", v); if (v === 'Não') { setPf(prev=>({ ...prev, enviou_contrato:'', nome_de:'' })); queueSave('pf','enviou_contrato',''); queueSave('pf','nome_de',''); } else if (v === 'Sim' && (pf.enviou_contrato||'') === 'Sim') { const nomeDe = (pf.nome_de || ''); setPf(prev=>({ ...prev, enviou_comprovante:'Sim', tipo_comprovante:'Outro', nome_comprovante: nomeDe })); queueSave('pf','enviou_comprovante','Sim'); queueSave('pf','tipo_comprovante','Outro'); queueSave('pf','nome_comprovante', nomeDe); } }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Enviou Contrato</span>
              {reqEnviouContrato && (
                <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold align-middle ${errs.enviou_contrato ? 'border-red-300 bg-red-100 text-red-700' : 'border-emerald-300 bg-emerald-100 text-emerald-700'}`}>
                  Obrigatório
                </span>
              )}
            </label>
            <SimpleSelect
              value={pf.enviou_contrato || ""}
              onChange={(v)=>{ setPf({...pf, enviou_contrato:v}); queueSave("pf","enviou_contrato", v); if (v !== 'Sim') { setPf(prev=>({ ...prev, nome_de:'' })); queueSave('pf','nome_de',''); } else if ((pf.tem_contrato||'') === 'Sim') { const nomeDe = (pf.nome_de || ''); setPf(prev=>({ ...prev, enviou_comprovante:'Sim', tipo_comprovante:'Outro', nome_comprovante: nomeDe })); queueSave('pf','enviou_comprovante','Sim'); queueSave('pf','tipo_comprovante','Outro'); queueSave('pf','nome_comprovante', nomeDe); } }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName={`h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600 ${!reqEnviouContrato ? 'opacity-50 pointer-events-none cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Nome De" value={pf.nome_de || ""} onChange={(v)=>{ setPf({...pf, nome_de:v}); queueSave("pf","nome_de", v); if ((pf.tem_contrato||'') === 'Sim' && (pf.enviou_contrato||'') === 'Sim') { setPf(prev=>({ ...prev, nome_comprovante: v })); queueSave('pf','nome_comprovante', v); } }} error={errs.nome_de} requiredMark={reqNomeDe} disabled={!reqNomeDe} />
          {/* Linha 4 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Enviou Comprovante</span>
              {reqComprovante && (
                <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold align-middle border-emerald-300 bg-emerald-100 text-emerald-700`}>
                  Obrigatório
                </span>
              )}
            </label>
            <SimpleSelect
              value={pf.enviou_comprovante || ""}
              onChange={(v)=>{ setPf({...pf, enviou_comprovante:v}); queueSave("pf","enviou_comprovante", v); if (v === 'Não') { setPf(prev=>({ ...prev, tipo_comprovante:'', nome_comprovante:'' })); queueSave('pf','tipo_comprovante',''); queueSave('pf','nome_comprovante',''); } }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Tipo de Comprovante</span>
              {reqComprovante && (
                <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold align-middle ${errs.tipo_comprovante ? 'border-red-300 bg-red-100 text-red-700' : 'border-emerald-300 bg-emerald-100 text-emerald-700'}`}>
                  Obrigatório
                </span>
              )}
            </label>
            <SimpleSelect
              value={pf.tipo_comprovante || ""}
              onChange={(v)=>{ setPf({...pf, tipo_comprovante:v}); queueSave("pf","tipo_comprovante", v); }}
              options={["Energia","Agua","Internet","Outro"]}
              className="mt-0"
              triggerClassName={`h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600 ${!reqComprovante ? 'opacity-50 pointer-events-none cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Nome do Comprovante" value={pf.nome_comprovante || ""} onChange={(v)=>{ setPf({...pf, nome_comprovante:v}); queueSave("pf","nome_comprovante", v); }} error={errs.nome_comprovante} requiredMark={reqComprovante} disabled={!reqComprovante} />
          {/* Linha 5 */}
          <Field label="Nome Locador" value={pf.nome_locador || ""} onChange={(v)=>{ setPf({...pf, nome_locador:v}); queueSave("pf","nome_locador", v); }} error={errs.nome_locador} requiredMark={reqLocador} className="md:col-span-2" />
          <Field label="Telefone Locador" value={pf.telefone_locador || ""} onChange={(v)=>{ setPf({...pf, telefone_locador:v}); queueSave("pf","telefone_locador", v); }} error={errs.telefone_locador} requiredMark={reqLocador} />
          {/* Linha 6 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Tem internet fixa atualmente?</span>
            </label>
            <SimpleSelect
              value={pf.tem_internet_fixa || ""}
              onChange={(v)=>{ setPf({...pf, tem_internet_fixa:v}); queueSave("pf","tem_internet_fixa", v); }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
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
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Vínculo</span>
            </label>
            <SimpleSelect
              value={pf.vinculo || ""}
              onChange={(v)=>{ setPf({...pf, vinculo:v}); queueSave("pf","vinculo", v); }}
              options={["Carteira Assinada","Presta Serviços","Contrato de Trabalho","Autonômo","Concursado","Outro"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Vínculo (Obs)" value={pf.vinculo_obs || ""} onChange={(v)=>{ setPf({...pf, vinculo_obs:v}); queueSave("pf","vinculo_obs", v); }} error={errs.vinculo_obs} requiredMark={reqVinculoObs} />
          <Field label="Emprego do PS" value={pf.emprego_do_ps || ""} onChange={(v)=>{ setPf({...pf, emprego_do_ps:v}); queueSave("pf","emprego_do_ps", v); }} red className="lg:col-span-4" />
        </div>
        </Card>

      <Card title="Cônjuge">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Linha 1 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              <span>Estado Civil</span>
            </label>
            <SimpleSelect
              value={pf.estado_civil || ""}
              onChange={(v)=>{ setPf({...pf, estado_civil:v}); queueSave("pf","estado_civil", v); }}
              options={["Solteiro(a)","Casado(a)","Amasiado(a)","Separado(a)","Viuvo(a)"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Observações" value={pf.conjuge_obs || ""} onChange={(v)=>{ setPf({...pf, conjuge_obs:v}); queueSave("pf","conjuge_obs", v); }} className="lg:col-span-3" />
          {/* Linha 2 */}
          <Field label="Nome" value={pf.conjuge_nome || ""} onChange={(v)=>{ setPf({...pf, conjuge_nome:v}); queueSave("pf","conjuge_nome", v); }} className="lg:col-span-2" />
          <Field label="Telefone" value={pf.conjuge_telefone || ""} onChange={(v)=>{ setPf({...pf, conjuge_telefone:v}); queueSave("pf","conjuge_telefone", v); }} />
          <Field label="Whatsapp" value={pf.conjuge_whatsapp || ""} onChange={(v)=>{ setPf({...pf, conjuge_whatsapp:v}); queueSave("pf","conjuge_whatsapp", v); }} />
          {/* Linha 3 */}
          <Field label="CPF" value={pf.conjuge_cpf || ""} onChange={(v)=>{ setPf({...pf, conjuge_cpf:v}); queueSave("pf","conjuge_cpf", v); }} />
          <Field label="Naturalidade" value={pf.conjuge_naturalidade || ""} onChange={(v)=>{ setPf({...pf, conjuge_naturalidade:v}); queueSave("pf","conjuge_naturalidade", v); }} />
          <Field label="UF" value={pf.conjuge_uf || ""} onChange={(v)=>{ setPf({...pf, conjuge_uf:v}); queueSave("pf","conjuge_uf", v); }} />
          <Field label="Idade" value={pf.conjuge_idade || ""} onChange={(v)=>{ setPf({...pf, conjuge_idade:v}); queueSave("pf","conjuge_idade", v); }} maxLength={2} />
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
            <label className="mb-1 block text-xs font-medium text-zinc-700">Plano escolhido</label>
            <SimpleSelect
              value={app.plano_acesso || ""}
              onChange={(v)=>{ setApp({...app, plano_acesso:v}); queueSave("app","plano_acesso", v); }}
              options={PLANO_OPTIONS as any}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Vencimento</label>
            <SimpleSelect
              value={app.venc || ""}
              onChange={(v)=>{ setApp({...app, venc:v}); queueSave("app","venc", v); }}
              options={["5","10","15","20","25"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">SVA Avulso</label>
            <SimpleSelect
              value={app.sva_avulso || ""}
              onChange={(v)=>{ setApp({...app, sva_avulso:v}); queueSave("app","sva_avulso", v); }}
              options={SVA_OPTIONS as any}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Carnê impresso</label>
            <SimpleSelect
              value={app.carne_impresso ? "Sim" : "Não"}
              onChange={(v)=>{ const val = (v === 'Sim'); setApp({...app, carne_impresso: val}); queueSave("app","carne_impresso", val); }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>

          <Field label="Quem solicitou" value={app.quem_solicitou || ""} onChange={(v)=>{ setApp({...app, quem_solicitou:v}); queueSave("app","quem_solicitou", v); }} />
          <Field label="Telefone do solicitante" value={app.telefone_solicitante || ""} onChange={(v)=>{ setApp({...app, telefone_solicitante:v}); queueSave("app","telefone_solicitante", v); }} />
          <Field label="Protocolo MK" value={app.protocolo_mk || ""} onChange={(v)=>{ setApp({...app, protocolo_mk:v}); queueSave("app","protocolo_mk", v); }} />

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Meio</label>
            <SimpleSelect
              value={app.meio || ""}
              onChange={(v)=>{ setApp({...app, meio:v}); queueSave("app","meio", v); }}
              options={["Ligação","Whatspp","Presensicial","Whats - Uber"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Textarea label="Informações relevantes" value={app.info_relevantes || ""} onChange={(v)=>{ setApp({...app, info_relevantes:v}); queueSave("app","info_relevantes", v); }} className="lg:col-span-4" />
          <Textarea label="Informações Relevantes do MK" value={app.info_mk || ""} onChange={(v)=>{ setApp({...app, info_mk:v}); queueSave("app","info_mk", v); }} red className="lg:col-span-4" />
        </div>
      </Card>

      {(
        <Card title="Parecer">
          <div className="space-y-4">
            <div className="relative">
              <UITTextarea
                ref={parecerRef as any}
                value={novoParecer}
                onChange={(e)=> {
                  const v = e.target.value || '';
                  setNovoParecer(v);
                  const atIdx = v.lastIndexOf('@');
                  if (atIdx >= 0) { setMentionFilterParecer(v.slice(atIdx + 1).trim()); setMentionOpenParecer(true); } else { setMentionOpenParecer(false); }
                  const slashIdx = v.lastIndexOf('/');
                  if (slashIdx>=0) {
                    setCmdOpenParecer(true); setCmdQueryParecer(v.slice(slashIdx+1).toLowerCase());
                    if (parecerRef.current) {
                      const ta = parecerRef.current!;
                      const c = getCaretCoordinates(ta, slashIdx + 1);
                      const rect = ta.getBoundingClientRect();
                      const top = rect.top + window.scrollY + c.top + c.height + 6;
                      const left = rect.left + window.scrollX + c.left;
                      setCmdAnchorParecer({ top, left });
                    }
                  } else { setCmdOpenParecer(false); }
                }}
                onKeyDown={async (e:any)=>{
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const txt = (novoParecer || '').trim();
                    if (!txt || !cardIdEff) return;
                    const tempNote:any = { id: `tmp-${Date.now()}`, text: txt, author_name: '', author_role: '', created_at: new Date().toISOString(), parent_id: null };
                    setPareceres(prev => [...(prev||[]), tempNote]);
                    setNovoParecer('');
                    try { await supabase.rpc('add_parecer', { p_card_id: cardIdEff, p_text: txt, p_parent_id: null }); } catch {}
                    return;
                  }
                }}
                placeholder="Escreva um novo parecer… Use @ para mencionar"
                rows={4}
              />
              {mentionOpenParecer && (
                <div className="absolute z-50 left-0 bottom-full mb-2">
                  <MentionDropdownParecer
                    items={profiles}
                    onPick={(p)=> {
                      const idx = (novoParecer || '').lastIndexOf('@');
                      const newVal = (novoParecer || '').slice(0, idx + 1) + p.full_name + ' ';
                      setNovoParecer(newVal);
                      setMentionOpenParecer(false);
                    }}
                  />
                </div>
              )}
              {cmdOpenParecer && (
                <div className="absolute z-50 left-0 bottom-full mb-2">
                  <CmdDropdown
                    items={[{ key:'aprovado', label:'Aprovado' },{ key:'negado', label:'Negado' },{ key:'reanalise', label:'Reanálise' },{ key:'tarefa', label:'Tarefa' },{ key:'anexo', label:'Anexo' }].filter(i=> i.key.includes(cmdQueryParecer))}
                    onPick={async (key)=>{
                      setCmdOpenParecer(false); setCmdQueryParecer('');
                      if (key==='tarefa') { setTaskOpen({ open:true, parentId:null, taskId:null, source:'parecer' }); return; }
                      if (key==='anexo') { setAttachOpen({ open:true, parentId:null, source:'parecer' }); return; }
                      try {
                        if (key==='aprovado') await changeStage(cardIdEff, 'analise', 'aprovados');
                        else if (key==='negado') await changeStage(cardIdEff, 'analise', 'negados');
                        else if (key==='reanalise') await changeStage(cardIdEff, 'analise', 'reanalise');
                      } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                    }}
                    initialQuery={cmdQueryParecer}
                  />
                </div>
              )}
            </div>
            <PareceresList
              cardId={cardIdEff}
              notes={pareceres as any}
              profiles={profiles}
              onReply={async (pid, text) => { await supabase.rpc('add_parecer', { p_card_id: cardIdEff, p_text: text, p_parent_id: pid }); }}
              onEdit={async (id, text) => { await supabase.rpc('edit_parecer', { p_card_id: cardIdEff, p_note_id: id, p_text: text }); }}
              onDelete={async (id) => {
                await supabase.rpc('delete_parecer', { p_card_id: cardIdEff, p_note_id: id });
                try {
                  const { data: card } = await supabase
                    .from('kanban_cards')
                    .select('reanalysis_notes')
                    .eq('id', cardIdEff)
                    .maybeSingle();
                  if (card && Array.isArray((card as any).reanalysis_notes)) setPareceres((card as any).reanalysis_notes);
                } catch {}
              }}
            />
          </div>
        </Card>
      )}
      <TaskDrawer
        open={taskOpen.open}
        onClose={()=> setTaskOpen({open:false, parentId:null, taskId:null})}
        cardId={cardIdEff}
        commentId={taskOpen.parentId ?? null}
        taskId={taskOpen.taskId ?? null}
        onCreated={async (t)=> {
          if (taskOpen.source === 'parecer') {
            try { await supabase.rpc('add_parecer', { p_card_id: cardIdEff, p_text: `📋 Tarefa criada: ${t.description}`, p_parent_id: null }); } catch {}
          }
        }}
      />
      <AttachmentsModal
        open={attachOpen.open}
        onClose={()=> setAttachOpen({open:false})}
        cardId={cardIdEff}
        commentId={attachOpen.parentId ?? null}
        onCompleted={async (files)=> {
            if (attachOpen.source === 'parecer' && files.length>0) {
              const names = files.map(f=> f.name).join(', ');
              try { await supabase.rpc('add_parecer', { p_card_id: cardIdEff, p_text: `📎 Anexo(s): ${names}`, p_parent_id: null }); } catch {}
          }
        }}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-white shadow-[0_5.447px_5.447px_rgba(0,0,0,0.12)]">
      <div className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold text-white bg-[var(--verde-primario)] rounded-t-xl">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Grid({ cols, children }: { cols: 1|2|3|4; children: React.ReactNode }) {
  const cls = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-4";
  return <div className={`grid gap-4 ${cls}`}>{children}</div>;
}

function Field({ label, value, onChange, className, error, red, requiredMark, disabled, maxLength }: { label: string; value: string; onChange: (v: string)=>void; className?: string; error?: boolean; red?: boolean; requiredMark?: boolean; disabled?: boolean; maxLength?: number }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-zinc-700">
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
        maxLength={maxLength}
        className={`h-10 w-full rounded-[7px] border ${error || red ? 'border-red-500 bg-red-500/10 focus:ring-2 focus:ring-red-300' : 'border-zinc-200 bg-zinc-50 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600'} px-3 text-sm outline-none shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-zinc-900'} placeholder:text-[rgba(1,137,66,0.6)]`}
        placeholder=""
        autoComplete="off"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, red, error, className, requiredMark, disabled }: { label: string; value: string; onChange: (v: string)=>void; red?: boolean; error?: boolean; className?: string; requiredMark?: boolean; disabled?: boolean }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-zinc-700">
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
        className={`min-h-[88px] w-full rounded-xl border ${error || red ? 'border-red-500 bg-red-500/10 focus:ring-2 focus:ring-red-300' : 'border-zinc-200 bg-zinc-50 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600'} px-3 py-2 text-sm outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-zinc-900'} placeholder:text-[rgba(1,137,66,0.6)] shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)]`}
        placeholder=""
      />
    </div>
  );
}

type Opt = string | { label: string; value: string; disabled?: boolean };
function Select({ label, value, onChange, options, error, requiredMark, disabled }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[]; error?: boolean; requiredMark?: boolean; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-700">
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
            className={`h-10 w-full rounded-[7px] border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-zinc-900'} ${error ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-300' : 'focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600'} shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)]`}
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

function CmdDropdown({ items, onPick, initialQuery }: { items: { key: string; label: string }[]; onPick: (key: string) => void | Promise<void>; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery || "");
  useEffect(()=> setQ(initialQuery || ""), [initialQuery]);
  const iconFor = (key: string) => {
    if (key === 'aprovado') return <CheckCircle className="w-4 h-4" />;
    if (key === 'negado') return <XCircle className="w-4 h-4" />;
    if (key === 'reanalise') return <RefreshCcw className="w-4 h-4" />;
    if (key === 'tarefa') return <ClipboardList className="w-4 h-4" />;
    if (key === 'anexo') return <Paperclip className="w-4 h-4" />;
    return null;
  };
  const filtered = items.filter(i => i.key.includes(q) || i.label.toLowerCase().includes(q.toLowerCase()));
  const decisions = filtered.filter(i => ['aprovado','negado','reanalise'].includes(i.key));
  const actions = filtered.filter(i => ['tarefa','anexo'].includes(i.key));
  return (
    <div className="cmd-menu-dropdown mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
      </div>
      {decisions.length > 0 && (
        <div className="py-1">
          <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">Decisão da análise</div>
          {decisions.map((i) => (
            <button key={i.key} onClick={() => onPick(i.key)} className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left">
              {iconFor(i.key)}
              <span>{i.label}</span>
            </button>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className="py-1 border-t border-zinc-100">
          <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">Ações</div>
          {actions.map((i) => (
            <button key={i.key} onClick={() => onPick(i.key)} className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left">
              {iconFor(i.key)}
              <span>{i.label}</span>
            </button>
          ))}
        </div>
      )}
      {decisions.length === 0 && actions.length === 0 && (
        <div className="px-3 py-2 text-zinc-500">Sem comandos</div>
      )}
    </div>
  );
}

function MentionDropdownParecer({ items, onPick }: { items: ProfileLite[]; onPick: (p: ProfileLite) => void }) {
  const [q, setQ] = useState("");
  const filtered = items.filter((p) => (p.full_name||'').toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="cmd-menu-dropdown mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar pessoas…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
      </div>
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-zinc-500">Sem resultados</div>
      ) : (
        <div className="py-1">
          {filtered.map((p) => (
            <button key={p.id} onClick={()=> onPick(p)} className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-zinc-50">
              <span>{p.full_name}{p.role ? ` (${p.role})` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Note = { id: string; text: string; author_name?: string; author_role?: string|null; created_at?: string; parent_id?: string|null; level?: number; deleted?: boolean };
function buildTree(notes: Note[]): Note[] {
  // Filtra itens soft-deletados para não renderizar
  const valid = (notes || []).filter((n: any) => !n?.deleted);
  const byId = new Map<string, any>();
  valid.forEach((n:any) => byId.set(n.id, { ...n, children: [] as any[] }));
  const roots: any[] = [];
  valid.forEach((n:any) => {
    const node = byId.get(n.id)!;
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id).children.push(node); else roots.push(node);
  });
  const sortFn = (a:any,b:any)=> new Date(a.created_at||'').getTime() - new Date(b.created_at||'').getTime();
  const sortTree = (arr:any[]) => { arr.sort(sortFn); arr.forEach(x=> sortTree(x.children)); };
  sortTree(roots);
  return roots as any;
}

function PareceresList({ cardId, notes, profiles, onReply, onEdit, onDelete }: { cardId: string; notes: Note[]; profiles: ProfileLite[]; onReply: (parentId:string, text:string)=>Promise<any>; onEdit: (id:string, text:string)=>Promise<any>; onDelete: (id:string)=>Promise<any> }) {
  const tree = useMemo(()=> buildTree(notes||[]), [notes]);
  const { open } = useSidebar();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const replyTaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cmdAnchor, setCmdAnchor] = useState<{top:number;left:number}>({ top: 0, left: 0 });
  const [reply, setReply] = useState("");
  const [isReplyingId, setIsReplyingId] = useState<string|null>(null);
  const [isEditingId, setIsEditingId] = useState<string|null>(null);
  const [editText, setEditText] = useState("");
  // Compositor Unificado (edição)
  const [editMentionOpen, setEditMentionOpen] = useState(false);
  const [editMentionFilter, setEditMentionFilter] = useState("");
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState("");
   const [pinned, setPinned] = useState<any|null>(null);
   const [leftOffset, setLeftOffset] = useState(0);
   const [bottomOffset, setBottomOffset] = useState(0);
   const [pinnedHeight, setPinnedHeight] = useState(120); // altura inicial em px
   const [isResizing, setIsResizing] = useState(false);
   useEffect(() => {
     const update = () => {
       const isDesktop = window.innerWidth >= 768;
       const left = isDesktop ? (open ? 300 : 60) : 0;
       setLeftOffset(left);
       // Não precisa de offset do footer, vamos alinhar direto com a sidebar
       setBottomOffset(0);
     };
     update();
     window.addEventListener('resize', update);
     return () => window.removeEventListener('resize', update);
   }, [open]);

   // Handle resize functionality
   useEffect(() => {
     if (!isResizing) return;
     
     const handleMouseMove = (e: MouseEvent) => {
       const newHeight = window.innerHeight - e.clientY;
       const minHeight = 80;
       const maxHeight = window.innerHeight * 0.6; // máximo 60% da tela
       setPinnedHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
     };

     const handleMouseUp = () => {
       setIsResizing(false);
     };

     document.addEventListener('mousemove', handleMouseMove);
     document.addEventListener('mouseup', handleMouseUp);
     
     return () => {
       document.removeEventListener('mousemove', handleMouseMove);
       document.removeEventListener('mouseup', handleMouseUp);
     };
   }, [isResizing]);
  return (
    <>
    <div className={`space-y-2`} style={{ paddingBottom: pinned ? `${pinnedHeight + 20}px` : '0' }}>
      {(!notes || notes.length===0) && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
      {tree.map((n:any) => (
        <div key={n.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-800 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)]" style={{ borderLeftColor: 'var(--verde-primario)', borderLeftWidth: '8px' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-medium">{n.author_name || '—'} <span className="ml-2 text-[11px] text-zinc-500">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</span></div>
                {n.author_role && <div className="text-[11px] text-zinc-500 truncate">{n.author_role}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 z-10">
              <button aria-label="Fixar parecer" onClick={()=> setPinned(p=> p?.id===n.id ? null : n)} className={(pinned?.id===n.id? 'text-amber-700' : 'text-zinc-500 hover:text-zinc-700')+" p-1 rounded hover:bg-zinc-100 transition-colors"}>
                <Pin className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button aria-label="Responder" onClick={()=> setIsReplyingId(v=> v===n.id ? null : n.id)} className="text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100">
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <ParecerMenu onEdit={()=> { setIsEditingId(n.id); setEditText(n.text||''); }} onDelete={()=> onDelete(n.id)} />
            </div>
          </div>
          {isEditingId===n.id ? (
            <div className="mt-2 space-y-2">
              <div className="relative">
                <UITTextarea
                  value={editText}
                  onChange={(e)=> {
                    const v = e.target.value || '';
                    setEditText(v);
                    const atIdx = v.lastIndexOf('@');
                    if (atIdx>=0) { setEditMentionFilter(v.slice(atIdx+1).trim()); setEditMentionOpen(true); } else { setEditMentionOpen(false); }
                    const slashIdx = v.lastIndexOf('/');
                    if (slashIdx>=0) { setEditCmdOpen(true); setEditCmdQuery(v.slice(slashIdx+1).toLowerCase()); } else { setEditCmdOpen(false); }
                  }}
                  onKeyDown={async (e:any)=>{
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const t = (editText||'').trim();
                      if (!t) return;
                      await onEdit(n.id, t);
                      setIsEditingId(null);
                      return;
                    }
                    if (e.key==='Escape') { e.preventDefault(); setIsEditingId(null); return; }
                    const v = (e.currentTarget.value || '') + (e.key.length===1? e.key : '');
                    const atIdx = v.lastIndexOf('@');
                    if (atIdx>=0) { setEditMentionFilter(v.slice(atIdx+1).trim()); setEditMentionOpen(true); } else { setEditMentionOpen(false); }
                    const slashIdx = v.lastIndexOf('/');
                    if (slashIdx>=0) { setEditCmdOpen(true); setEditCmdQuery(v.slice(slashIdx+1).toLowerCase()); } else { setEditCmdOpen(false); }
                  }}
                  placeholder="Edite o parecer… Use @ para mencionar e / para comandos"
                  rows={4}
                />
                {editMentionOpen && (
                  <div className="absolute z-50 left-0 bottom-full mb-2">
                    <MentionDropdownParecer
                      items={profiles.filter((p)=> (p.full_name||'').toLowerCase().includes(editMentionFilter.toLowerCase()))}
                      onPick={(p)=>{
                        const idx = (editText||'').lastIndexOf('@');
                        const newVal = (editText||'').slice(0, idx + 1) + p.full_name + ' ';
                        setEditText(newVal);
                        setEditMentionOpen(false);
                      }}
                    />
                  </div>
                )}
                {editCmdOpen && (
                  <div className="absolute z-50 left-0 bottom-full mb-2">
                    <CmdDropdown
                      items={[{ key:'aprovado', label:'Aprovado' },{ key:'negado', label:'Negado' },{ key:'reanalise', label:'Reanálise' },{ key:'tarefa', label:'Tarefa' },{ key:'anexo', label:'Anexo' }].filter(i=> i.key.includes(editCmdQuery) || i.label.toLowerCase().includes(editCmdQuery))}
                      onPick={async (key)=>{
                        setEditCmdOpen(false); setEditCmdQuery('');
                        if (key==='tarefa') { (window as any).dispatchEvent(new Event('mz-open-task')); return; }
                        if (key==='anexo') { (window as any).dispatchEvent(new Event('mz-open-attach')); return; }
                        try {
                          if (key==='aprovado') await changeStage(cardId, 'analise', 'aprovados');
                          else if (key==='negado') await changeStage(cardId, 'analise', 'negados');
                          else if (key==='reanalise') await changeStage(cardId, 'analise', 'reanalise');
                        } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                      }}
                      initialQuery={editCmdQuery}
                    />
                  </div>
                )}
              </div>
              {/* Removidos CTAs; envio via Enter, cancelar via Esc */}
            </div>
          ) : (
            <div className="mt-1 whitespace-pre-line break-words">{n.text}</div>
          )}
          <div className="mt-3">
            {isReplyingId===n.id ? (
              <div className="mt-2 flex gap-2 relative">
                <div className="flex-1">
                  <UITTextarea
                   ref={replyTaRef as any}
                   value={reply}
                   onChange={(e)=> setReply(e.target.value)}
                   onKeyDown={async (e)=>{
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       const t = reply.trim();
                       if (!t) return;
                       await onReply(n.id, t);
                       setReply('');
                       setIsReplyingId(null);
                       return;
                     }
                     if (e.key === 'Escape') { e.preventDefault(); setReply(''); setIsReplyingId(null); }
                   }}
                   onKeyUp={(e)=>{ const v=e.currentTarget.value||''; const slashIdx=v.lastIndexOf('/'); if (slashIdx>=0){ setCmdOpen(true); setCmdQuery(v.slice(slashIdx+1).toLowerCase()); if (replyTaRef.current){ const c=getCaretCoordinates(replyTaRef.current, slashIdx+1); setCmdAnchor({ top: c.top + c.height + 6, left: Math.max(0, Math.min(c.left, replyTaRef.current.clientWidth - 256)) }); } } else setCmdOpen(false); }}
                   rows={3}
                    placeholder="Responder... (/aprovado, /negado, /reanalise, /tarefa, /anexo)"
                  />
                {cmdOpen && (
                  <div className="absolute z-50 left-0 bottom-full mb-2">
                    <CmdDropdown
                      items={[{key:'tarefa',label:'Tarefa'},{key:'anexo',label:'Anexo'}].filter(i=> i.key.includes(cmdQuery))}
                      onPick={async (key)=>{ setCmdOpen(false); setCmdQuery(''); if (key==='tarefa'){ (window as any).dispatchEvent(new Event('mz-open-task')); } else if (key==='anexo'){ (window as any).dispatchEvent(new Event('mz-open-attach')); } }}
                      initialQuery={cmdQuery}
                    />
                  </div>
                )}
                </div>
              </div>
            ) : null}
          </div>
          {n.children && n.children.length>0 && (
            <div className="mt-2 space-y-2 pl-4">
              {n.children.map((c:any)=> (
                <div
                  key={c.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800"
                  style={{ borderLeftColor: 'var(--verde-primario)', borderLeftWidth: '8px', borderLeftStyle: 'solid' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.author_name || '—'} <span className="ml-2 text-[11px] text-zinc-500">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span></div>
                      {c.author_role && <div className="text-[11px] text-zinc-500 truncate">{c.author_role}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button aria-label="Fixar parecer" onClick={()=> setPinned(p=> p?.id===c.id ? null : c)} className={(pinned?.id===c.id? 'text-amber-700' : 'text-zinc-500 hover:text-zinc-700')+" p-1 rounded hover:bg-zinc-100 transition-colors"}>
                        <Pin className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button aria-label="Responder" onClick={()=> setIsReplyingId(v=> v===c.id ? null : c.id)} className="text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100">
                        <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <ParecerMenu onEdit={()=> { setIsEditingId(c.id); setEditText(c.text||''); }} onDelete={()=> onDelete(c.id)} />
                    </div>
                  </div>
                  {isEditingId===c.id ? (
                    <div className="mt-2 space-y-2">
                      <div className="relative">
                        <UITTextarea
                          value={editText}
                          onChange={(e)=> {
                            const v = e.target.value || '';
                            setEditText(v);
                            const atIdx = v.lastIndexOf('@');
                            if (atIdx>=0) { setEditMentionFilter(v.slice(atIdx+1).trim()); setEditMentionOpen(true); } else { setEditMentionOpen(false); }
                            const slashIdx = v.lastIndexOf('/');
                            if (slashIdx>=0) { setEditCmdOpen(true); setEditCmdQuery(v.slice(slashIdx+1).toLowerCase()); } else { setEditCmdOpen(false); }
                          }}
                          onKeyDown={async (e:any)=>{
                            if (e.key==='Enter' && !e.shiftKey) {
                              e.preventDefault();
                              const t=(editText||'').trim(); if(!t) return;
                              await onEdit(c.id, t);
                              setIsEditingId(null);
                              return;
                            }
                            if (e.key==='Escape') { e.preventDefault(); setIsEditingId(null); return; }
                            const v = (e.currentTarget.value || '') + (e.key.length===1? e.key : '');
                            const atIdx = v.lastIndexOf('@');
                            if (atIdx>=0) { setEditMentionFilter(v.slice(atIdx+1).trim()); setEditMentionOpen(true); } else { setEditMentionOpen(false); }
                            const slashIdx = v.lastIndexOf('/');
                            if (slashIdx>=0) { setEditCmdOpen(true); setEditCmdQuery(v.slice(slashIdx+1).toLowerCase()); } else { setEditCmdOpen(false); }
                          }}
                          placeholder="Edite o parecer… Use @ para mencionar e / para comandos"
                          rows={4}
                        />
                        {editMentionOpen && (
                          <div className="absolute z-50 left-0 bottom-full mb-2">
                            <MentionDropdownParecer
                              items={profiles.filter((p)=> (p.full_name||'').toLowerCase().includes(editMentionFilter.toLowerCase()))}
                              onPick={(p)=>{
                                const idx = (editText||'').lastIndexOf('@');
                                const newVal = (editText||'').slice(0, idx + 1) + p.full_name + ' ';
                                setEditText(newVal);
                                setEditMentionOpen(false);
                              }}
                            />
                          </div>
                        )}
                        {editCmdOpen && (
                          <div className="absolute z-50 left-0 bottom-full mb-2">
                            <CmdDropdown
                              items={[{ key:'aprovado', label:'Aprovado' },{ key:'negado', label:'Negado' },{ key:'reanalise', label:'Reanálise' },{ key:'tarefa', label:'Tarefa' },{ key:'anexo', label:'Anexo' }].filter(i=> i.key.includes(editCmdQuery) || i.label.toLowerCase().includes(editCmdQuery))}
                              onPick={async (key)=>{
                                setEditCmdOpen(false); setEditCmdQuery('');
                                if (key==='tarefa') { (window as any).dispatchEvent(new Event('mz-open-task')); return; }
                                if (key==='anexo') { (window as any).dispatchEvent(new Event('mz-open-attach')); return; }
                                try {
                                  if (key==='aprovado') await changeStage(cardId, 'analise', 'aprovados');
                                  else if (key==='negado') await changeStage(cardId, 'analise', 'negados');
                                  else if (key==='reanalise') await changeStage(cardId, 'analise', 'reanalise');
                                } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                              }}
                              initialQuery={editCmdQuery}
                            />
                          </div>
                        )}
                      </div>
                      {/* Removidos CTAs; envio via Enter, cancelar via Esc */}
                    </div>
                  ) : (
                    <div className="mt-1 whitespace-pre-line break-words">{c.text}</div>
                  )}

                  {isReplyingId===c.id && (
                    <div className="mt-2 flex gap-2 relative">
                      <div className="flex-1">
                        <UITTextarea
                          value={reply}
                          onChange={(e)=> setReply(e.target.value)}
                          onKeyDown={async (e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); const t=reply.trim(); if(!t) return; await onReply(c.id, t); setReply(''); setIsReplyingId(null); return; } if (e.key==='Escape'){ e.preventDefault(); setReply(''); setIsReplyingId(null); } }}
                          onKeyUp={(e)=>{ const v=e.currentTarget.value||''; const slashIdx=v.lastIndexOf('/'); if (slashIdx>=0){ setCmdOpen(true); setCmdQuery(v.slice(slashIdx+1).toLowerCase()); if (replyTaRef.current){ const rc=getCaretCoordinates(replyTaRef.current, slashIdx+1); setCmdAnchor({ top: rc.top + rc.height + 6, left: Math.max(0, Math.min(rc.left, replyTaRef.current.clientWidth - 256)) }); } } else setCmdOpen(false); }}
                          rows={3}
                          placeholder="Responder... (/aprovado, /negado, /reanalise, /tarefa, /anexo)"
                        />
                        {cmdOpen && (
                          <div className="absolute z-50 left-0 bottom-full mb-2">
                            <CmdDropdown
                              items={[{key:'tarefa',label:'Tarefa'},{key:'anexo',label:'Anexo'}].filter(i=> i.key.includes(cmdQuery))}
                              onPick={async (key)=>{ setCmdOpen(false); setCmdQuery(''); if (key==='tarefa'){ (window as any).dispatchEvent(new Event('mz-open-task')); } else if (key==='anexo'){ (window as any).dispatchEvent(new Event('mz-open-attach')); } }}
                              initialQuery={cmdQuery}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
     {pinned && (
       <div className="fixed bottom-0 z-40 pointer-events-none" style={{ left: leftOffset, right: 0, height: `${pinnedHeight}px` }}>
           <div className="pointer-events-auto border-t border-zinc-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] w-full h-full flex flex-col">
             {/* Resize Handle */}
             <div 
               className={`w-full h-2 cursor-ns-resize flex items-center justify-center border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${isResizing ? 'bg-zinc-100' : ''}`}
               onMouseDown={(e) => {
                 e.preventDefault();
                 setIsResizing(true);
               }}
             >
               <div className="w-12 h-1 bg-zinc-300 rounded-full"></div>
             </div>
             
             {/* Header */}
             <div className="px-4 py-3 text-xs text-zinc-600 flex items-center justify-between border-b border-zinc-100 shrink-0">
               <div className="min-w-0 flex items-center gap-2">
                 <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
                 <div className="truncate">
                   <span className="font-medium text-zinc-800">{pinned.author_name || '—'}</span>
                   <span className="ml-2 text-zinc-500">{pinned.created_at ? new Date(pinned.created_at).toLocaleString() : ''}</span>
                 </div>
               </div>
               <button onClick={()=> setPinned(null)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 transition-colors">
                 <Pin className="w-3.5 h-3.5" strokeWidth={1.75} />
                 <span className="hidden sm:inline">Desafixar</span>
               </button>
             </div>
             
             {/* Content */}
             <div className="px-4 py-3 text-sm text-zinc-800 whitespace-pre-line break-words overflow-y-auto flex-1">{pinned.text}</div>
           </div>
       </div>
     )}
    </>
  );
}

function ParecerMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={()=> setOpen(v=>!v)} className="parecer-menu-trigger p-2 rounded-full hover:bg-zinc-100 transition-colors duration-200" aria-label="Abrir menu">
        <svg className="w-5 h-5 text-zinc-700" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={()=> setOpen(false)} />
          <div className="parecer-menu-dropdown absolute right-0 top-10 z-[9999] w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 overflow-hidden">
            <button className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors duration-150" onClick={()=> { setOpen(false); onEdit(); }}>
              <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Editar
            </button>
            <div className="h-px bg-zinc-100 mx-2" />
            <button className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-150" onClick={async ()=> { setOpen(false); await onDelete(); }}>
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  const props = ['direction','boxSizing','height','overflowX','overflowY','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','paddingTop','paddingRight','paddingBottom','paddingLeft','fontStyle','fontVariant','fontWeight','fontStretch','fontSize','fontFamily','lineHeight','textAlign','textTransform','textIndent','textDecoration','letterSpacing','tabSize','MozTabSize'];
  props.forEach((p:any)=> { (mirror.style as any)[p] = (style as any)[p] ?? style.getPropertyValue(p); });
  mirror.style.position = 'absolute'; mirror.style.visibility = 'hidden'; mirror.style.whiteSpace = 'pre-wrap'; mirror.style.wordWrap = 'break-word'; mirror.style.width = `${textarea.clientWidth}px`;
  mirror.textContent = textarea.value.substring(0, position);
  const span = document.createElement('span'); span.textContent = textarea.value.substring(position) || '.'; mirror.appendChild(span);
  document.body.appendChild(mirror);
  const spRect = span.getBoundingClientRect(); const top = spRect.top + textarea.scrollTop; const left = spRect.left + textarea.scrollLeft; const height = spRect.height || parseFloat(style.lineHeight) || 16; document.body.removeChild(mirror);
  return { top, left, height };
}

// (Removido) Segmented control; categorias agora ficam dentro do dropdown
