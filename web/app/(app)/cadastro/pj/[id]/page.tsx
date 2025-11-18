"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import clsx from "clsx";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SimpleSelect } from "@/components/ui/select";
import { Search, CheckCircle, XCircle, RefreshCcw, ClipboardList, Paperclip, User as UserIcon, Pin } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { listProfiles, type ProfileLite } from "@/features/comments/services";
import { getAttachmentUrl, publicUrl } from "@/features/attachments/services";
import { TaskDrawer } from "@/features/tasks/TaskDrawer";
import {
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_MAX_SIZE,
  uploadAttachmentBatch,
} from "@/features/attachments/upload";
import { UnifiedComposer, type ComposerDecision, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import { renderTextWithChips } from "@/utils/richText";
import { TABLE_CARD_ATTACHMENTS } from "@/lib/constants";

function digitsOnly(value: string) {
  return (value || "").replace(/\D+/g, "");
}

const DECISION_META: Record<string, { label: string; className: string }> = {
  aprovado: { label: "Aprovado", className: "decision-chip--primary" },
  negado: { label: "Negado", className: "decision-chip--destructive" },
  reanalise: { label: "Reanálise", className: "decision-chip--warning" },
};

function decisionPlaceholder(decision: ComposerDecision | string | null | undefined) {
  return decision ? `[decision:${decision}]` : "";
}

function DecisionTag({ decision }: { decision?: string | null }) {
  if (!decision) return null;
  const meta = DECISION_META[decision];
  if (!meta) return null;
  return <span className={clsx("decision-chip", meta.className)}>{meta.label}</span>;
}

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
  const search = useSearchParams();
  const applicantId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [app, setApp] = useState<AppModel>({});
  const [pj, setPj] = useState<PjModel>({});
  const timer = useRef<NodeJS.Timeout | null>(null);
  const pendingApp = useRef<Partial<AppModel>>({});
  const pendingPj = useRef<Partial<PjModel>>({});
  // Parecer UI states
  const [pareceres, setPareceres] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [novoParecer, setNovoParecer] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [mentionOpenParecer, setMentionOpenParecer] = useState(false);
  const [mentionFilterParecer, setMentionFilterParecer] = useState("");
  const [cmdOpenParecer, setCmdOpenParecer] = useState(false);
  const [cmdQueryParecer, setCmdQueryParecer] = useState("");
  const parecerComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const [taskOpen, setTaskOpen] = useState<{open:boolean, parentId?: string|null, taskId?: string|null, source?: 'parecer'|'conversa'}>({open:false});
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentContextRef = useRef<{ commentId?: string | null; source?: 'parecer' | 'conversa' } | null>(null);
  const [cardIdEff, setCardIdEff] = useState<string>('');

  function triggerAttachmentPicker(context?: { commentId?: string | null; source?: 'parecer' | 'conversa' }) {
    attachmentContextRef.current = context ?? null;
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
      attachmentInputRef.current.click();
    }
  }

  async function processAttachmentSelection(files: File[]) {
    if (!cardIdEff || files.length === 0) return;
    const context = attachmentContextRef.current;
    attachmentContextRef.current = null;

    const tooBig = files.find((file) => file.size > ATTACHMENT_MAX_SIZE);
    if (tooBig) {
      alert(`O arquivo "${tooBig.name}" excede o limite de ${(ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`);
      return;
    }

    const invalidType = files.find(
      (file) => file.type && !ATTACHMENT_ALLOWED_TYPES.includes(file.type)
    );
    if (invalidType) {
      alert(`O tipo de arquivo "${invalidType.type || invalidType.name}" não é permitido para anexos.`);
      return;
    }

    try {
      const uploaded = await uploadAttachmentBatch({
        cardId: cardIdEff,
        commentId: context?.commentId ?? null,
        files: files.map((file) => {
          const dot = file.name.lastIndexOf(".");
          const baseName = dot > 0 ? file.name.slice(0, dot) : file.name;
          return { file, displayName: baseName || file.name };
        }),
      });

      // Conversa: criar thread automática quando anexar sem commentId
      if (context?.source === 'conversa' && !context?.commentId && uploaded.length > 0) {
        try {
          const payload: any = { card_id: cardIdEff, content: '' };
          try {
            const { data: auth } = await supabase.auth.getUser();
            const uid = auth.user?.id;
            if (uid) {
              payload.author_id = uid;
              const { data: prof } = await supabase.from('profiles').select('full_name, role').eq('id', uid).single();
              if (prof) { payload.author_name = (prof as any).full_name ?? null; payload.author_role = (prof as any).role ?? null; }
            }
          } catch {}
          const { data: c, error: cErr } = await supabase.from('card_comments').insert(payload).select('id').single();
          if (cErr || !c?.id) throw cErr || new Error('Falha ao criar comentário para anexos');
          const newCommentId = c.id as string;
          await Promise.all(uploaded.map((u) => supabase.from(TABLE_CARD_ATTACHMENTS).update({ comment_id: newCommentId }).eq('file_path', u.path)));
        } catch (e: any) {
          console.error('Falha ao vincular anexos à nova conversa', e);
          alert(e?.message || 'Anexos enviados, mas não foi possível criar a conversa.');
        }
      }

      if (context?.source === "parecer" && uploaded.length > 0) {
        const names = uploaded.map((f) => f.name).join(", ");
        try {
          await supabase.rpc("add_parecer", {
            p_card_id: cardIdEff,
            p_text: `📎 Anexo(s): ${names}`,
            p_parent_id: null,
            p_decision: null,
          });
        } catch (err) {
          console.error("Falha ao registrar parecer para anexos", err);
        }
      }
    } catch (error: any) {
      console.error("Falha ao enviar anexos", error);
      alert(error?.message ?? "Falha ao anexar arquivos.");
    }
  }

  async function handleAttachmentInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await processAttachmentSelection(files);
  }

  useEffect(() => {
    function handleOpenAttach(event?: Event) {
      const detail = (event as CustomEvent<{ commentId?: string | null; source?: 'parecer' | 'conversa' }> | undefined)?.detail;
      triggerAttachmentPicker({
        commentId: detail?.commentId ?? null,
        source: detail?.source ?? 'parecer',
      });
    }
    window.addEventListener("mz-open-attach", handleOpenAttach);
    return () => window.removeEventListener("mz-open-attach", handleOpenAttach);
  }, []);

  async function refreshReanalysisNotes(cardId: string) {
    if (!cardId) return;
    const { data: card, error } = await supabase
      .from('kanban_cards')
      .select('reanalysis_notes')
      .eq('id', cardId)
      .maybeSingle();
    if (!error && card && Array.isArray((card as any).reanalysis_notes)) {
      setPareceres((card as any).reanalysis_notes);
    }
  }

  async function syncDecisionStatus(decision: ComposerDecision | null) {
    if (!cardIdEff) return;
    try {
      if (decision === null) {
        await supabase.rpc('set_card_decision', { p_card_id: cardIdEff, p_decision: null });
      } else if (decision === 'reanalise') {
        await supabase.rpc('set_card_decision', { p_card_id: cardIdEff, p_decision: 'reanalise' });
      } else {
        await supabase.rpc('set_card_decision', { p_card_id: cardIdEff, p_decision: decision });
      }
    } catch (err) {
      console.warn('set_card_decision failed', err);
    }
  }

  async function handleSubmitParecer(value: ComposerValue) {
    const text = (value.text || '').trim();
    const hasDecision = !!value.decision;
    if (!cardIdEff) return;
    if (!hasDecision && !text) return;

    const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;

    const tempNote: any = {
      id: `tmp-${Date.now()}`,
      text: hasDecision && !text ? '' : text,
      decision: value.decision ?? null,
      author_name: '',
      author_role: '',
      created_at: new Date().toISOString(),
      parent_id: null,
    };
    setPareceres(prev => [...(prev || []), tempNote]);

    try {
      await supabase.rpc('add_parecer', {
        p_card_id: cardIdEff,
        p_text: payloadText,
        p_parent_id: null,
        p_decision: value.decision ?? null,
      });
      await refreshReanalysisNotes(cardIdEff);
      if (value.decision === 'aprovado' || value.decision === 'negado') {
        await syncDecisionStatus(value.decision);
      } else if (value.decision === 'reanalise') {
        await syncDecisionStatus('reanalise');
      }
    } catch (err: any) {
      setPareceres(prev => (prev || []).filter((n: any) => n.id !== tempNote.id));
      alert(err?.message || 'Falha ao adicionar parecer');
    } finally {
      const resetValue: ComposerValue = { decision: null, text: '', mentions: [] };
      setNovoParecer(resetValue);
      requestAnimationFrame(() => parecerComposerRef.current?.setValue(resetValue));
      setMentionOpenParecer(false);
      setCmdOpenParecer(false);
    }
  }

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

        // Triangulação: pegar card por applicant_id e carregar pareceres
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

  // Realtime: applicants + pj_fichas + kanban_cards (pareceres)
  useEffect(() => {
    let ch1:any; let ch2:any; let ch3:any;
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
      if (cardIdEff) {
        ch3 = supabase
          .channel(`rt-pj-card-${cardIdEff}`)
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

  

  // UI spacer height to keep bottom gap consistent when a parecer is pinned
  const [pinnedSpace, setPinnedSpace] = useState<number>(0);

  if (loading) return <div className="p-4 text-sm text-zinc-600">Carregando…</div>;

  const reqComprov = (pj.enviou_comprovante||'') === 'Sim';

  const from = (search?.get('from') || '').toLowerCase();
  const showAnalyzeCrumb = from === 'analisar';
  return (
    <div className="pj-form p-6 max-w-5xl mx-auto">

      {/* Seção 1: Dados da Empresa */}
      <Card title="Dados da Empresa">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Field label="Razão Social" value={app.primary_name||''} onChange={(v)=>{ setApp({...app, primary_name:v}); queueSave('app','primary_name',v); }} className="lg:col-span-2" />
          <Field label="CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCnpj(v); setApp({...app, cpf_cnpj:m}); queueSave('app','cpf_cnpj',m); }} inputMode="numeric" maxLength={18} />
          <Field label="Data de Abertura" value={pj.data_abertura||''} onChange={(v)=>{ const m=formatDateBR(v); setPj({...pj, data_abertura:m}); queueSave('pj','data_abertura', m); }} inputMode="numeric" maxLength={10} />
          <Field label="Nome Fantasia" value={pj.nome_fantasia||''} onChange={(v)=>{ setPj({...pj, nome_fantasia:v}); queueSave('pj','nome_fantasia', v); }} />
          <Field label="Nome de Fachada" value={pj.nome_fachada||''} onChange={(v)=>{ setPj({...pj, nome_fachada:v}); queueSave('pj','nome_fachada', v); }} />
          <Field label="Área de Atuação" value={pj.area_atuacao||''} onChange={(v)=>{ setPj({...pj, area_atuacao:v}); queueSave('pj','area_atuacao', v); }} className="md:col-span-3 xl:col-span-4" />
        </div>
      </Card>

      {/* Seção 2: Endereço */}
      <Card title="Endereço">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Linha 1: Endereço | Número */}
          <Field label="Endereço" value={app.address_line||''} onChange={(v)=>{ setApp({...app, address_line:v}); queueSave('app','address_line', v); }} className="md:col-span-2" />
          <Field label="Número" value={app.address_number||''} onChange={(v)=>{ setApp({...app, address_number:v}); queueSave('app','address_number', v); }} />
          {/* Linha 2: Complemento (linha inteira) */}
          <Field label="Complemento" value={app.address_complement||''} onChange={(v)=>{ setApp({...app, address_complement:v}); queueSave('app','address_complement', v); }} className="md:col-span-3" />
          {/* Linha 3: Tipo (md:col-span-2) | Observações */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Tipo de Imóvel</label>
            <SimpleSelect
              value={pj.tipo_imovel||''}
              onChange={(v)=>{ setPj({...pj, tipo_imovel:v}); queueSave('pj','tipo_imovel', v); }}
              options={["Comércio Terreo","Comércio Sala","Casa"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Obs Tipo de Imóvel" value={pj.obs_tipo_imovel||''} onChange={(v)=>{ setPj({...pj, obs_tipo_imovel:v}); queueSave('pj','obs_tipo_imovel', v); }} />
          {/* Linha 4: CEP | Bairro | Tempo */}
          <Field label="CEP" value={app.cep||''} onChange={(v)=>{ const m = formatCep(v); setApp({...app, cep:m}); queueSave('app','cep', m); }} />
          <Field label="Bairro" value={app.bairro||''} onChange={(v)=>{ setApp({...app, bairro:v}); queueSave('app','bairro', v); }} />
          <Field label="Tempo no Endereço" value={pj.tempo_endereco||''} onChange={(v)=>{ setPj({...pj, tempo_endereco:v}); queueSave('pj','tempo_endereco', v); }} />
          {/* Linha 5: Estabelecimento (md:col-span-2) | Observações */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Tipo de Estabelecimento</label>
            <SimpleSelect
              value={pj.tipo_estabelecimento||''}
              onChange={(v)=>{ setPj({...pj, tipo_estabelecimento:v}); queueSave('pj','tipo_estabelecimento', v); }}
              options={["Própria","Alugada","Cedida","Outros"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Obs Estabelecimento" value={pj.obs_estabelecimento||''} onChange={(v)=>{ setPj({...pj, obs_estabelecimento:v}); queueSave('pj','obs_estabelecimento', v); }} />
          <Field label="Endereço do PS" value={pj.end_ps||''} onChange={(v)=>{ setPj({...pj, end_ps:v}); queueSave('pj','end_ps', v); }} red className="md:col-span-3" />
        </div>
      </Card>

      {/* Seção 3: Contatos e Documentos */}
      <Card title="Contatos e Documentos">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Telefone" value={app.phone||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, phone:m}); queueSave('app','phone', m); }} />
          <Field label="WhatsApp" value={app.whatsapp||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, whatsapp:m}); queueSave('app','whatsapp', m); }} />
          <Field label="Fones no PS" value={pj.fones_ps||''} onChange={(v)=>{ setPj({...pj, fones_ps:v}); queueSave('pj','fones_ps', v); }} red />
          <Field label="E-mail" value={app.email||''} onChange={(v)=>{ setApp({...app, email:v}); queueSave('app','email', v); }} className="md:col-span-4" />

          {/* Linha: Possui Internet | Operadora | Plano | Valor */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Possui Internet</label>
            <SimpleSelect
              value={(pj.possui_internet as any) || ''}
              onChange={(v)=>{ setPj({...pj, possui_internet:v}); queueSave('pj','possui_internet', v); }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Operadora Internet" value={pj.operadora_internet||''} onChange={(v)=>{ setPj({...pj, operadora_internet:v}); queueSave('pj','operadora_internet', v); }} />
          <Field label="Plano Internet" value={pj.plano_internet||''} onChange={(v)=>{ setPj({...pj, plano_internet:v}); queueSave('pj','plano_internet', v); }} />
          <Field label="Valor Internet" value={pj.valor_internet||''} onChange={(v)=>{ const m = formatCurrencyBR(v); setPj({...pj, valor_internet:m}); queueSave('pj','valor_internet', m); }} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Enviou Comprovante</label>
            <SimpleSelect
              value={(pj.enviou_comprovante as any) || ''}
              onChange={(v)=>{ setPj({...pj, enviou_comprovante:v}); queueSave('pj','enviou_comprovante', v); if (v==='Não'){ setPj(prev=>({ ...prev, tipo_comprovante:'', nome_comprovante:'' })); queueSave('pj','tipo_comprovante',''); queueSave('pj','nome_comprovante',''); } }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Tipo de Comprovante</label>
            <SimpleSelect
              value={pj.tipo_comprovante||''}
              onChange={(v)=>{ setPj({...pj, tipo_comprovante:v}); queueSave('pj','tipo_comprovante', v); }}
              options={["Energia","Agua","Internet","Outro"]}
              className="mt-0"
              triggerClassName={`h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600 ${!reqComprov ? 'opacity-50 pointer-events-none cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Em nome de" value={pj.nome_comprovante||''} onChange={(v)=>{ setPj({...pj, nome_comprovante:v}); queueSave('pj','nome_comprovante', v); }} disabled={!reqComprov} requiredMark={reqComprov} />
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Contrato Social</label>
            <SimpleSelect
              value={(pj.contrato_social as any) || ''}
              onChange={(v)=>{ setPj({...pj, contrato_social:v}); queueSave('pj','contrato_social', v); }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Observações" value={pj.obs_contrato_social||''} onChange={(v)=>{ setPj({...pj, obs_contrato_social:v}); queueSave('pj','obs_contrato_social', v); }} />
        </div>
      </Card>

      {/* Seção 4: Sócios */}
      <TaskDrawer
        open={taskOpen.open}
        onClose={()=> setTaskOpen({open:false, parentId:null, taskId:null, source: undefined})}
        cardId={cardIdEff}
        commentId={taskOpen.parentId ?? null}
        taskId={taskOpen.taskId ?? null}
        source={taskOpen.source ?? 'conversa'}
        onCreated={async (t)=> {
          if (taskOpen.source === 'parecer') {
            try {
              const { data: card } = await supabase
                .from('kanban_cards')
                .select('reanalysis_notes')
                .eq('id', cardIdEff)
                .maybeSingle();
              if (card && Array.isArray((card as any).reanalysis_notes)) setPareceres((card as any).reanalysis_notes);
            } catch {}
          }
        }}
      />
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachmentInputChange}
        accept={ATTACHMENT_ALLOWED_TYPES.join(",")}
      />
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
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Meio</label>
            <SimpleSelect
              value={app.meio||''}
              onChange={(v)=>{ setApp({...app, meio:v}); queueSave('app','meio', v); }}
              options={[...MEIO_UI]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="Tel" value={app.telefone_solicitante||''} onChange={(v)=>{ const m=maskPhone(v); setApp({...app, telefone_solicitante:m}); queueSave('app','telefone_solicitante', m); }} />
          <Field label="Protocolo MK" value={app.protocolo_mk||''} onChange={(v)=>{ setApp({...app, protocolo_mk:v}); queueSave('app','protocolo_mk', v); }} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Plano de Acesso</label>
            <SimpleSelect
              value={app.plano_acesso||''}
              onChange={(v)=>{ setApp({...app, plano_acesso:v}); queueSave('app','plano_acesso', v); }}
              options={PLANO_OPTIONS as any}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">SVA Avulso</label>
            <SimpleSelect
              value={app.sva_avulso||''}
              onChange={(v)=>{ setApp({...app, sva_avulso:v}); queueSave('app','sva_avulso', v); }}
              options={SVA_OPTIONS as any}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Vencimento</label>
            <SimpleSelect
              value={String(app.venc||'')}
              onChange={(v)=>{ setApp({...app, venc:v}); queueSave('app','venc', v); }}
              options={["5","10","15","20","25"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Carnê Impresso</label>
            <SimpleSelect
              value={app.carne_impresso ? 'Sim':'Não'}
              onChange={(v)=>{ const val = (v==='Sim'); setApp({...app, carne_impresso:val}); queueSave('app','carne_impresso', val); }}
              options={["Sim","Não"]}
              className="mt-0"
              triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
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

      {(
        <Card title="Parecer">
          <div className="space-y-4">
            <div className="relative">
              <UnifiedComposer
                ref={parecerComposerRef}
                placeholder="Escreva um novo parecer… Use @ para mencionar"
                onChange={(val)=> setNovoParecer(val)}
                onSubmit={handleSubmitParecer}
                onCancel={()=> {
                  setCmdOpenParecer(false);
                  setMentionOpenParecer(false);
                }}
                onMentionTrigger={(query)=> {
                  setMentionFilterParecer(query.trim());
                  setMentionOpenParecer(true);
                }}
                onMentionClose={()=> setMentionOpenParecer(false)}
                onCommandTrigger={(query)=> {
                  setCmdQueryParecer(query.toLowerCase());
                  setCmdOpenParecer(true);
                }}
                onCommandClose={()=> {
                  setCmdOpenParecer(false);
                  setCmdQueryParecer('');
                }}
              />
              {mentionOpenParecer && (
                <div className="absolute z-50 left-0 bottom-full mb-2">
                  <MentionDropdownParecer
                    items={profiles}
                    onPick={(p)=> {
                      parecerComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                      setMentionOpenParecer(false);
                      setMentionFilterParecer("");
                    }}
                  />
                </div>
              )}
              {cmdOpenParecer && (
                <div className="absolute z-50 left-0 bottom-full mb-2">
                  <CmdDropdown
                    items={[
                      { key:'aprovado', label:'Aprovado' },
                      { key:'negado', label:'Negado' },
                      { key:'reanalise', label:'Reanálise' },
                    ].filter(i=> i.key.includes(cmdQueryParecer) || i.label.toLowerCase().includes(cmdQueryParecer))}
                    onPick={async (key)=>{
                      setCmdOpenParecer(false); setCmdQueryParecer('');
                      if (key==='aprovado' || key==='negado' || key==='reanalise') {
                        parecerComposerRef.current?.setDecision(key as ComposerDecision);
                        try {
                      await syncDecisionStatus(key as ComposerDecision);
                        } catch (e:any) {
                          alert(e?.message || 'Falha ao mover');
                        }
                      }
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
              onReply={async (pid, value) => {
                const text = (value.text || '').trim();
                const hasDecision = !!value.decision;
                if (!hasDecision && !text) return;
                const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
                await supabase.rpc('add_parecer', {
                  p_card_id: cardIdEff,
                  p_text: payloadText,
                  p_parent_id: pid,
                  p_decision: value.decision ?? null,
                });
                await refreshReanalysisNotes(cardIdEff);
              }}
              onEdit={async (id, value) => {
                const text = (value.text || '').trim();
                const hasDecision = !!value.decision;
                if (!hasDecision && !text) return;
                const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
                await supabase.rpc('edit_parecer', {
                  p_card_id: cardIdEff,
                  p_note_id: id,
                  p_text: payloadText,
                  p_decision: value.decision ?? null,
                });
                await refreshReanalysisNotes(cardIdEff);
              }}
              onDelete={async (id) => {
                await supabase.rpc('delete_parecer', { p_card_id: cardIdEff, p_note_id: id });
                await refreshReanalysisNotes(cardIdEff);
              }}
              onDecisionChange={syncDecisionStatus}
              onPinnedChange={(active, h)=> setPinnedSpace(active ? h : 0)}
            />
          </div>
        </Card>
      )}
      {pinnedSpace>0 && (<div aria-hidden className="w-full" style={{ height: pinnedSpace }} />)}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-white shadow-[0_5.447px_5.447px_rgba(0,0,0,0.12)]">
      <div className="px-4 py-2 text-sm font-semibold text-white bg-[var(--verde-primario)] border-b border-zinc-200 rounded-t-xl">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, className, red, disabled, maxLength, inputMode, requiredMark }: { label: string; value: string; onChange: (v:string)=>void; className?: string; red?: boolean; disabled?: boolean; maxLength?: number; inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"]; requiredMark?: boolean }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-zinc-700">
        <span>{label}</span>
        {requiredMark && (
          <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold align-middle ${red ? 'border-red-300 bg-red-100 text-red-700' : 'border-emerald-300 bg-emerald-100 text-emerald-700'}`}>
            Obrigatório
          </span>
        )}
      </label>
      <input
        value={value}
        onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`h-10 w-full rounded-[7px] border ${red ? 'border-red-500 bg-red-500/10 focus:ring-2 focus:ring-red-300' : 'border-zinc-200 bg-zinc-50 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600'} px-3 text-sm outline-none shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-zinc-900'} placeholder:text-[rgba(1,137,66,0.6)]`}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, red }: { label: string; value: string; onChange: (v:string)=>void; red?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-700">{label}</label>
      <textarea
        value={value}
        onChange={(e)=> onChange(e.target.value)}
        className={`min-h-[88px] w-full rounded-xl border ${red ? 'border-red-500 bg-red-500/10 focus:ring-2 focus:ring-red-300' : 'border-zinc-200 bg-zinc-50 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600'} px-3 py-2 text-sm outline-none text-zinc-900 placeholder:text-[rgba(1,137,66,0.6)] shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)]`}
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
      <label className="mb-1 block text-xs font-medium text-zinc-700">
        <span>{label}</span>
      </label>
      <select
        value={displayValue}
        onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
        disabled={disabled}
        className={`h-10 w-full rounded-[7px] border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-zinc-900'} focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)]`}
      >
        {norm.map((opt, idx) => (
          <option key={opt.value+idx} value={opt.value} disabled={!!opt.disabled}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ================= Parecer helpers (copied UI from EditarFicha) =================
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
            <button
              key={i.key}
              onClick={() => onPick(i.key)}
              className={clsx(
                "cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left",
                {
                  'cmd-menu-item--primary': i.key === 'aprovado',
                  'cmd-menu-item--destructive': i.key === 'negado',
                  'cmd-menu-item--warning': i.key === 'reanalise',
                }
              )}
            >
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

type Note = { id: string; text: string; decision?: ComposerDecision | string | null; author_name?: string; author_role?: string|null; created_at?: string; parent_id?: string|null; level?: number; deleted?: boolean };
function buildTree(notes: Note[]): Note[] {
  // Oculta itens marcados como deletados (soft-delete)
  const valid = (notes || []).filter((n:any) => !n?.deleted);
  const byId = new Map<string, any>();
  const normalizeText = (note: any) => {
    if (!note) return '';
    if (!note.decision) return note.text || '';
    const placeholder = decisionPlaceholder(note.decision as any);
    return note.text === placeholder ? '' : (note.text || '');
  };
  valid.forEach((n:any) => {
    byId.set(n.id, { ...n, text: normalizeText(n), children: [] as any[] });
  });
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

function PareceresList({ cardId, notes, profiles, onReply, onEdit, onDelete, onDecisionChange, onPinnedChange }: { cardId: string; notes: Note[]; profiles: ProfileLite[]; onReply: (parentId:string, value: ComposerValue)=>Promise<any>; onEdit: (id:string, value: ComposerValue)=>Promise<any>; onDelete: (id:string)=>Promise<any>; onDecisionChange: (decision: ComposerDecision | null)=>Promise<void>; onPinnedChange?: (active:boolean, height:number)=>void }) {
  const tree = useMemo(()=> buildTree(notes||[]), [notes]);
  const { open } = useSidebar();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const replyBoxRef = useRef<HTMLDivElement | null>(null);
  const editBoxRef = useRef<HTMLDivElement | null>(null);
  const replyComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const editComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const [mentionOpenReply, setMentionOpenReply] = useState(false);
  const [mentionFilterReply, setMentionFilterReply] = useState("");
  const [replyValue, setReplyValue] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [isReplyingId, setIsReplyingId] = useState<string|null>(null);
  const [isEditingId, setIsEditingId] = useState<string|null>(null);
  const [editValue, setEditValue] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [editMentionOpen, setEditMentionOpen] = useState(false);
  const [editMentionFilter, setEditMentionFilter] = useState("");
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState("");
  const [pinned, setPinned] = useState<any|null>(null);
  const [leftOffset, setLeftOffset] = useState(0);
  const [pinnedHeight, setPinnedHeight] = useState(120);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const update = () => {
      const isDesktop = window.innerWidth >= 768;
      const left = isDesktop ? (open ? 300 : 60) : 0;
      setLeftOffset(left);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const minHeight = 80;
      const maxHeight = window.innerHeight * 0.6;
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

  useEffect(() => {
    if (onPinnedChange) onPinnedChange(!!pinned, pinned ? pinnedHeight : 0);
  }, [pinned, pinnedHeight, onPinnedChange]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (isEditingId) {
        const box = editBoxRef.current;
        if (box && target && !box.contains(target)) {
          setIsEditingId(null);
        }
      }
      if (isReplyingId) {
        const rbox = replyBoxRef.current;
        if (rbox && target && !rbox.contains(target)) {
          setReplyValue({ decision: null, text: '' });
          setMentionOpenReply(false);
          setCmdOpen(false);
          setIsReplyingId(null);
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isEditingId, isReplyingId]);

  async function handleDecisionShortcut(cardIdLocal: string, decisionChange: (decision: ComposerDecision | null) => Promise<void>, key: 'aprovado' | 'negado' | 'reanalise') {
    if (!cardIdLocal) return;
    if (key === 'aprovado') {
      await decisionChange('aprovado');
    } else if (key === 'negado') {
      await decisionChange('negado');
    } else if (key === 'reanalise') {
      await decisionChange('reanalise');
    }
  }

  const renderThread = (note: any, depth = 0): React.ReactNode => {
    const isRoot = depth === 0;
    const isEditing = isEditingId === note.id;
    const isReplying = isReplyingId === note.id;
    const containerClass = isRoot
      ? "rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-800 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)]"
      : "rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800";

  return (
      <div
        key={note.id}
        className={containerClass}
        style={{ borderLeftColor: 'var(--verde-primario)', borderLeftWidth: '8px', borderLeftStyle: 'solid' }}
      >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex items-start gap-2">
            {isRoot && <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />}
                <div className="min-w-0">
                  <div className="truncate font-medium">
                {note.author_name || '—'}
                    <span className="ml-2 text-[11px] text-zinc-500">
                  {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                    </span>
                  </div>
              {note.author_role && <div className="text-[11px] text-zinc-500 truncate">{note.author_role}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 z-10">
                <button
                  aria-label="Fixar parecer"
              onClick={() => setPinned((p: any) => (p?.id === note.id ? null : note))}
              className={`${pinned?.id === note.id ? 'text-amber-700' : 'text-zinc-500 hover:text-zinc-700'} p-1 rounded hover:bg-zinc-100 transition-colors`}
                >
                  <Pin className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  aria-label="Responder"
              onClick={() => {
                if (isReplying) {
                      setIsReplyingId(null);
                      setReplyValue({ decision: null, text: '' });
                  setMentionOpenReply(false);
                  setCmdOpen(false);
                    } else {
                  setIsReplyingId(note.id);
                      setReplyValue({ decision: null, text: '' });
                      requestAnimationFrame(() => replyComposerRef.current?.focus());
                    }
                  }}
                  className="text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12h16M12 4l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <ParecerMenu
              onEdit={() => {
                setIsEditingId(note.id);
                const nextVal: ComposerValue = { decision: (note.decision as ComposerDecision) ?? null, text: note.text || '', mentions: [] };
                    setEditValue(nextVal);
                    requestAnimationFrame(() => {
                      editComposerRef.current?.setValue(nextVal);
                      editComposerRef.current?.focus();
                    });
                  }}
              onDelete={() => onDelete(note.id)}
                />
              </div>
            </div>

        {!isEditing && (
              <div className="mt-2 space-y-2">
            <DecisionTag decision={note.decision} />
            <div className="break-words">{renderTextWithChips(note.text)}</div>
            {isRoot && (
              <>
                {note.updated_at && (
                  <div className="text-[11px] text-zinc-500">Atualizado em {new Date(note.updated_at).toLocaleString()}</div>
                )}
                {note.updated_by_name && (
                  <div className="text-[11px] text-zinc-500">Por {note.updated_by_name}</div>
                )}
              </>
            )}
            {Array.isArray(note.attachments) && note.attachments.length > 0 && (
              <div className="pt-2 space-y-2">
                {note.attachments.map((att: any, idx: number) => (
                  <AttachmentChip key={att.id ?? att.file_path ?? `${note.id}-att-${idx}`} attachment={att} />
                ))}
                      </div>
                    )}
                      </div>
                    )}

        {isEditing && (
          <div className="mt-3" ref={editBoxRef}>
                        <div className="relative">
                          <UnifiedComposer
                            ref={editComposerRef}
                            defaultValue={editValue}
                onChange={(val) => setEditValue(val)}
                onSubmit={async (val) => {
                              const trimmed = (val.text || '').trim();
                              if (!trimmed) return;
                  await onEdit(note.id, val);
                              setIsEditingId(null);
                              if (val.decision === 'aprovado' || val.decision === 'negado') {
                                await onDecisionChange(val.decision);
                              } else if (val.decision === 'reanalise') {
                    await onDecisionChange('reanalise');
                              }
                            }}
                onCancel={() => setIsEditingId(null)}
                onMentionTrigger={(query) => {
                              setEditMentionFilter(query.trim());
                              setEditMentionOpen(true);
                            }}
                onMentionClose={() => setEditMentionOpen(false)}
                onCommandTrigger={(query) => {
                              setEditCmdQuery(query.toLowerCase());
                              setEditCmdOpen(true);
                            }}
                onCommandClose={() => {
                              setEditCmdOpen(false);
                              setEditCmdQuery('');
                            }}
                          />
                          {editMentionOpen && (
                            <div className="absolute z-50 left-0 bottom-full mb-2">
                              <MentionDropdownParecer
                    items={profiles.filter((p) => (p.full_name || '').toLowerCase().includes(editMentionFilter.toLowerCase()))}
                    onPick={(p) => {
                                  editComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                                  setEditMentionOpen(false);
                                  setEditMentionFilter("");
                                }}
                              />
                            </div>
                          )}
                          {editCmdOpen && (
                            <div className="absolute z-50 left-0 bottom-full mb-2">
                  <CmdDropdown
                    items={[{ key: 'aprovado', label: 'Aprovado' }, { key: 'negado', label: 'Negado' }, { key: 'reanalise', label: 'Reanálise' }].filter((i) => i.key.includes(editCmdQuery) || i.label.toLowerCase().includes(editCmdQuery))}
                    onPick={async (key) => {
                      setEditCmdOpen(false);
                      setEditCmdQuery('');
                      if (key === 'aprovado' || key === 'negado' || key === 'reanalise') {
                        editComposerRef.current?.setDecision(key as ComposerDecision);
                        try {
                          await handleDecisionShortcut(cardId, onDecisionChange, key as any);
                        } catch (e: any) {
                          alert(e?.message || 'Falha ao mover');
                        }
                      }
                    }}
                    initialQuery={editCmdQuery}
                  />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

        {isReplying && (
                      <div className="mt-2 flex gap-2 relative" ref={replyBoxRef}>
                        <div className="flex-1 relative">
                          <UnifiedComposer
                            ref={replyComposerRef}
                            defaultValue={replyValue}
                            placeholder="Responder... (/aprovado, /negado, /reanalise)"
                onChange={(val) => setReplyValue(val)}
                onSubmit={async (val) => {
                              const trimmed = (val.text || '').trim();
                              if (!trimmed) return;
                  await onReply(note.id, val);
                              if (val.decision === 'aprovado' || val.decision === 'negado') {
                                await onDecisionChange(val.decision);
                              } else if (val.decision === 'reanalise') {
                    await onDecisionChange('reanalise');
                              }
                              const resetVal: ComposerValue = { decision: null, text: '', mentions: [] };
                              setReplyValue(resetVal);
                  requestAnimationFrame(() => replyComposerRef.current?.setValue(resetVal));
                              setIsReplyingId(null);
                              setMentionOpenReply(false);
                              setCmdOpen(false);
                            }}
                onCancel={() => {
                              setIsReplyingId(null);
                              setMentionOpenReply(false);
                              setCmdOpen(false);
                            }}
                onMentionTrigger={(query) => {
                              setMentionFilterReply(query.trim());
                              setMentionOpenReply(true);
                            }}
                onMentionClose={() => setMentionOpenReply(false)}
                onCommandTrigger={(query) => {
                              setCmdQuery(query.toLowerCase());
                              setCmdOpen(true);
                            }}
                onCommandClose={() => {
                              setCmdOpen(false);
                              setCmdQuery('');
                            }}
                          />
                          {mentionOpenReply && (
                            <div className="absolute z-50 left-0 bottom-full mb-2">
                              <MentionDropdownParecer
                    items={profiles.filter((p) => (p.full_name || '').toLowerCase().includes(mentionFilterReply.toLowerCase()))}
                    onPick={(p) => {
                                  replyComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                                  setMentionOpenReply(false);
                                  setMentionFilterReply("");
                                }}
                              />
                            </div>
                          )}
                          {cmdOpen && (
                            <div className="absolute z-50 left-0 bottom-full mb-2">
                  <CmdDropdown
                    items={[{ key: 'aprovado', label: 'Aprovado' }, { key: 'negado', label: 'Negado' }, { key: 'reanalise', label: 'Reanálise' }].filter((i) => i.key.includes(cmdQuery) || i.label.toLowerCase().includes(cmdQuery))}
                    onPick={async (key) => {
                      setCmdOpen(false);
                      setCmdQuery('');
                      if (key === 'aprovado' || key === 'negado' || key === 'reanalise') {
                        replyComposerRef.current?.setDecision(key as ComposerDecision);
                        try {
                          await handleDecisionShortcut(cardId, onDecisionChange, key as any);
                        } catch (e: any) {
                          alert(e?.message || 'Falha ao mover');
                        }
                      }
                    }}
                    initialQuery={cmdQuery}
                  />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

        {Array.isArray(note.children) && note.children.length > 0 && (
          <div className="mt-2 space-y-2 pl-4">
            {note.children.map((child: any) => renderThread(child, depth + 1))}
              </div>
            )}
          </div>
    );
  };

  return (
    <>
      <div className="space-y-2">
        {(!notes || notes.length===0) && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
        {tree.map((note:any) => renderThread(note, 0))}

      </div>
      {pinned && (
        <div className="fixed bottom-0 z-40 pointer-events-none" style={{ left: leftOffset, right: 0, height: `${pinnedHeight}px` }}>
          <div className="pointer-events-auto border-t border-zinc-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] w-full h-full flex flex-col">
            <div
              className={`w-full h-2 cursor-ns-resize flex items-center justify-center border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${isResizing ? 'bg-zinc-100' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
            >
              <div className="w-12 h-1 bg-zinc-300 rounded-full"></div>
            </div>
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
            <div className="px-4 py-3 text-sm text-zinc-800 break-words overflow-y-auto flex-1">
              <div className="mb-2"><DecisionTag decision={pinned.decision} /></div>
              {renderTextWithChips(pinned.text)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AttachmentChip({ attachment }: { attachment: any }) {
  const [url, setUrl] = useState<string | null>(() => attachment?.public_url || attachment?.url || null);
  useEffect(() => {
    if (attachment?.public_url || attachment?.url) return;
    let active = true;
    (async () => {
      try {
        // Se tem ID, usa getAttachmentUrl (seguro, com RLS)
        if (attachment?.id) {
          const resolved = await getAttachmentUrl(attachment.id, 'download');
          if (active) setUrl(resolved);
        } else {
          // Fallback: se não tem ID, usa publicUrl (compatibilidade)
          const path = attachment?.file_path || attachment?.path;
          if (!path) { setUrl(null); return; }
          const resolved = await publicUrl(path);
          if (active) setUrl(resolved);
        }
      } catch {
        if (active) setUrl(null);
      }
    })();
    return () => { active = false; };
  }, [attachment?.id, attachment?.file_path, attachment?.path, attachment?.public_url, attachment?.url]);

  const name = attachment?.file_name || attachment?.name || 'Anexo';
  const created = attachment?.created_at ? new Date(attachment.created_at).toLocaleString() : null;
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-zinc-200 bg-white px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-lg shrink-0">📎</span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-zinc-800 break-words">{name}</div>
          {created && <div className="text-[11px] text-zinc-500">{created}</div>}
        </div>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:text-emerald-700 shrink-0">
          Abrir ↗
        </a>
      ) : (
        <span className="text-xs text-zinc-400 shrink-0">Sem link</span>
      )}
    </div>
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

// Utilitário para posição do caret
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
