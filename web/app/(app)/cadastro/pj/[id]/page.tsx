"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent, useCallback } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SimpleSelect } from "@/components/ui/select";
import { Search, CheckCircle, XCircle, RefreshCcw, Paperclip, User as UserIcon, Pin } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { listProfiles, type ProfileLite } from "@/lib/profiles";
import MentionDropdown from "@/components/mentions/MentionDropdown";
import { useIndexedDraft } from "@/hooks/useIndexedDraft";
import { saveDraft, getDraft, deleteDraft } from "@/lib/drafts";
import { getAttachmentUrl, publicUrl, listAttachments, type CardAttachment } from "@/features/attachments/services";
import { PareceresList } from "@/features/editar-ficha/components/PareceresList";
import { PendingFileChip } from "@/components/ui/file-upload";
import {
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_MAX_SIZE,
  uploadAttachmentBatch,
} from "@/features/attachments/upload";
import { UnifiedComposer, type ComposerDecision, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import { renderTextWithChips } from "@/utils/richText";
import { listRoutes, type Route } from "@/features/builder/services";
import { DateSingleKanbanPopover } from "@/components/ui/date-single-kanban-popover";
import { TimeMultiSelect } from "@/components/ui/time-multi-select";
import { TIME_SLOTS } from "@/features/agenda/mock";
import { useUserRole } from "@/hooks/useUserRole";
import { FEATURES } from "@/lib/features";
//

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
  created_at?: string;
  representante_mz?: string;
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
  { label: '150 Mega - R$ 59,90', value: '150 Mega - R$ 59,90' },
  { label: '300 Mega - R$ 69,90', value: '300 Mega - R$ 69,90' },
  { label: '600 Mega - R$ 79,90', value: '600 Mega - R$ 79,90' },
  { label: '1000 Mega (1Gb) - R$ 99,90', value: '1000 Mega (1Gb) - R$ 99,90' },
  { label: '— IP Dinâmico —', value: '__hdr_ipdin', disabled: true },
  { label: '150 Mega + IP Dinâmico - R$ 74,90', value: '150 Mega + IP Dinâmico - R$ 74,90' },
  { label: '300 Mega + IP Dinâmico - R$ 89,90', value: '300 Mega + IP Dinâmico - R$ 89,90' },
  { label: '600 Mega + IP Dinâmico - R$ 94,90', value: '600 Mega + IP Dinâmico - R$ 94,90' },
  { label: '1000 Mega (1Gb) + IP Dinâmico - R$ 114,90', value: '1000 Mega (1Gb) + IP Dinâmico - R$ 114,90' },
  { label: '— IP Fixo —', value: '__hdr_ipfixo', disabled: true },
  { label: '150 Mega + IP Fixo - R$ 259,90', value: '150 Mega + IP Fixo - R$ 259,90' },
  { label: '300 Mega + IP Fixo - R$ 269,90', value: '300 Mega + IP Fixo - R$ 269,90' },
  { label: '600 Mega + IP Fixo - R$ 279,90', value: '600 Mega + IP Fixo - R$ 279,90' },
  { label: '1000 Mega (1Gb) + IP Fixo - R$ 299,90', value: '1000 Mega (1Gb) + IP Fixo - R$ 299,90' },
];

const SVA_OPTIONS: ({label:string,value:string,disabled?:boolean})[] = [
  { label: 'XXXXX', value: 'XXXXX' },
  { label: '— Streaming e TV —', value: '__hdr_stream', disabled: true },
  { label: 'MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)', value: 'MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)' },
  { label: 'DEZZER: R$ 15,00', value: 'DEZZER: R$ 15,00' },
  { label: 'MZ CINE-PLAY: R$ 19,90', value: 'MZ CINE-PLAY: R$ 19,90' },
  { label: '— Hardware e Equipamentos —', value: '__hdr_hw', disabled: true },
  { label: 'SETUP BOX MZNET: R$100,00 A VISTA OU R$120,00 EM ATÉ 3X NO CARTÃO', value: 'SETUP BOX MZNET: R$100,00 A VISTA OU R$120,00 EM ATÉ 3X NO CARTÃO' },
  { label: 'ROKU TV: R$200,00 A VISTA OU R$230,00 EM ATÉ 3X NO CARTÃO', value: 'ROKU TV: R$200,00 A VISTA OU R$230,00 EM ATÉ 3X NO CARTÃO' },
  { label: '— Wi‑Fi Extend —', value: '__hdr_wifi', disabled: true },
  { label: 'WIFI EXTEND - R$35', value: 'WIFI EXTEND - R$35' },
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

// Tipo de Instalação (Agenda/Builder)
const TIPO_INST_UI_PJ = ['XXXX','Casa','Prédio com Prumada','Prédio sem Prumada','Wi-Fi Extend'] as const;
function uiToTipoInstPJ(v: string): string | null {
  if (v === 'XXXX') return null; // 'Nada' -> não altera lógica; persiste null
  const m: any = { 'Casa':'casa','Prédio com Prumada':'predio_com_prumada','Prédio sem Prumada':'predio_sem_prumada','Wi-Fi Extend':'wifi_extend' };
  return m[v] ?? null;
}

export default function CadastroPJPage() {
  // Auto-print quando aberto em modo de exportação
  const sp = useSearchParams();
  useEffect(() => {
    const isExport = (sp.get('from') || '').toLowerCase() === 'export';
    const doPrint = (sp.get('print') || '') === '1';
    if (!isExport || !doPrint) return;
    const t = setTimeout(() => { try { window.print(); } catch {} }, 400);
    return () => clearTimeout(t);
  }, [sp]);
  const params = useParams();
  const search = useSearchParams();
  const applicantId = params?.id as string;
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [app, setApp] = useState<AppModel>({});
  const [pj, setPj] = useState<PjModel>({});
  const timer = useRef<NodeJS.Timeout | null>(null);
  const pendingApp = useRef<Partial<AppModel>>({});
  const pendingPj = useRef<Partial<PjModel>>({});
  // Parecer UI states
  const [pareceres, setPareceres] = useState<any[]>([]);
  const [cardAttachments, setCardAttachments] = useState<CardAttachment[]>([]);
  const [parecerPendingFiles, setParecerPendingFiles] = useState<File[]>([]);
  const parecerAttachInputRef = useRef<HTMLInputElement | null>(null);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { role: currentUserRole, isLeitor } = useUserRole();
  const canWriteParecer = !isLeitor && currentUserRole !== "vendedor" && currentUserRole !== "instalador";
  const [novoParecer, setNovoParecer] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [mentionOpenParecer, setMentionOpenParecer] = useState(false);
  const [mentionFilterParecer, setMentionFilterParecer] = useState("");
  const [mentionAnchorParecer, setMentionAnchorParecer] = useState<{ top: number; left: number; height?: number } | null>(null);
  const parecerContainerRef = useRef<HTMLDivElement | null>(null);
  const [cmdOpenParecer, setCmdOpenParecer] = useState(false);
  const [cmdQueryParecer, setCmdQueryParecer] = useState("");
  const parecerComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentContextRef = useRef<{ source?: "parecer" } | null>(null);
  const [cardIdEff, setCardIdEff] = useState<string>('');
  const [tipoInstalacao, setTipoInstalacao] = useState<string>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [horaAt, setHoraAt] = useState<string[]>([]);
  // Draft de parecer (consistente com o modal)
  const draftKey = useMemo(() => `parecer:${cardIdEff || ''}:${currentUserId ?? 'self'}`, [cardIdEff, currentUserId]);
  const [parecerDraft, setParecerDraft, clearParecerDraft, draftLoaded] = useIndexedDraft<{ text: string; decision: ComposerDecision | null }>(draftKey, { text: '', decision: null });
  const hydratedOnceRef = useRef(false);
  const prevCardRef = useRef<string | null>(null);
  // Dirty + status tracking
  const dirtyAppFields = useRef<Set<keyof AppModel>>(new Set());
  const dirtyPjFields = useRef<Set<keyof PjModel>>(new Set());
  const fieldStatus = useRef<Record<string, 'idle'|'pending'|'error'>>({});
  const [, forceStatusRender] = useState(0);

  const markFieldStatus = useCallback((key: string, status: 'idle'|'pending'|'error') => {
    fieldStatus.current[key] = status;
    forceStatusRender(v => v+1);
  }, []);

  const applyAppSnapshot = useCallback((next: Partial<AppModel> | null | undefined) => {
    if (!next) return;
    setApp((prev) => {
      const merged: AppModel = { ...prev };
      (Object.keys(next) as (keyof AppModel)[]).forEach((k) => {
        if (dirtyAppFields.current.has(k)) return;
        const val = next[k];
        if (typeof val === 'undefined') return;
        (merged as any)[k] = val as any;
      });
      return merged;
    });
  }, []);

  const applyPjSnapshot = useCallback((next: Partial<PjModel> | null | undefined) => {
    if (!next) return;
    setPj((prev) => {
      const merged: PjModel = { ...prev };
      (Object.keys(next) as (keyof PjModel)[]).forEach((k) => {
        if (dirtyPjFields.current.has(k)) return;
        const val = next[k];
        if (typeof val === 'undefined') return;
        (merged as any)[k] = val as any;
      });
      return merged;
    });
  }, []);

  const getFieldStatus = useCallback((key: string) => fieldStatus.current[key] || 'idle', []);

  function triggerAttachmentPicker(context?: { source?: "parecer" }) {
    if (isLeitor) return;
    attachmentContextRef.current = context ?? null;
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
      attachmentInputRef.current.click();
    }
  }

  async function processAttachmentSelection(files: File[]) {
    if (isLeitor) return;
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
        files: files.map((file) => {
          const dot = file.name.lastIndexOf(".");
          const baseName = dot > 0 ? file.name.slice(0, dot) : file.name;
          return { file, displayName: baseName || file.name };
        }),
      });

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
    if (isLeitor) return;
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await processAttachmentSelection(files);
  }

  // Carregar rotas (bairros) do banco
  useEffect(() => {
    (async () => {
      try {
        const r = await listRoutes();
        setRoutes(r.filter((x) => x.active));
      } catch (err: any) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Falha ao carregar rotas (routes)', err?.message || err);
        }
      }
    })();
  }, []);

  useEffect(() => {
    function handleOpenAttach(event?: Event) {
      const detail = (event as CustomEvent<{ source?: "parecer" }> | undefined)?.detail;
      triggerAttachmentPicker({
        source: detail?.source ?? "parecer",
      });
    }
    window.addEventListener("mz-open-attach", handleOpenAttach);
    return () => window.removeEventListener("mz-open-attach", handleOpenAttach);
  }, [isLeitor]);

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

  const refreshAttachments = useCallback(async () => {
    if (!cardIdEff) return;
    try { setCardAttachments(await listAttachments(cardIdEff)); } catch {}
  }, [cardIdEff]);

  async function syncDecisionStatus(decision: ComposerDecision | null) {
    if (!canWriteParecer) return;
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

  function addParecerFiles(files: File[]) {
    if (!files.length) return;
    const tooBig = files.find(f => f.size > ATTACHMENT_MAX_SIZE);
    if (tooBig) { alert(`"${tooBig.name}" excede ${(ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`); return; }
    const invalid = files.find(f => f.type && !ATTACHMENT_ALLOWED_TYPES.includes(f.type));
    if (invalid) { alert(`Tipo "${invalid.type || invalid.name}" não permitido.`); return; }
    setParecerPendingFiles(prev => [...prev, ...files]);
  }

  async function handleSubmitParecer(value: ComposerValue) {
    if (!canWriteParecer) return;
    const text = (value.text || '').trim();
    const hasDecision = !!value.decision;
    if (!cardIdEff) return;
    if (!hasDecision && !text && parecerPendingFiles.length === 0) return;

    const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
    const filesToUpload = parecerPendingFiles.slice();
    if (filesToUpload.length > 0) setParecerPendingFiles([]);

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
      const { data: rpcData } = await supabase.rpc('add_parecer', {
        p_card_id: cardIdEff,
        p_text: payloadText,
        p_parent_id: null,
        p_decision: value.decision ?? null,
      });
      await refreshReanalysisNotes(cardIdEff);
      if (value.decision === 'aprovado' || value.decision === 'negado' || value.decision === 'reanalise') {
        await syncDecisionStatus(value.decision);
      }
      if (filesToUpload.length > 0) {
        const notes = (rpcData as any)?.reanalysis_notes || [];
        const newNote = [...notes].reverse().find((n: any) => !n.parent_id && !n.deleted);
        const noteId: string | null = newNote?.id ?? null;
        if (noteId) {
          try {
            await uploadAttachmentBatch({ cardId: cardIdEff, noteId, files: filesToUpload.map(f => ({ file: f })) });
            await refreshAttachments();
          } catch (uploadErr) {
            console.error('Falha ao enviar anexos do parecer', uploadErr);
          }
        }
      }
    } catch (err: any) {
      setPareceres(prev => (prev || []).filter((n: any) => n.id !== tempNote.id));
      alert(err?.message || 'Falha ao adicionar parecer');
    } finally {
      const resetValue: ComposerValue = { decision: null, text: '', mentions: [] };
      setNovoParecer(resetValue);
      requestAnimationFrame(() => parecerComposerRef.current?.setValue(resetValue));
      try { await clearParecerDraft(); } catch {}
      try { await deleteDraft(`parecer:${cardIdEff}:self`); } catch {}
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
        setCurrentUserId(userId);
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
        applyAppSnapshot(a2||{});

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
        applyPjSnapshot(pfix||{});

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
          .select('id, reanalysis_notes, tipo_instalacao, due_at, hora_at')
          .eq('applicant_id', applicantId)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const useCardId = (cardRow as any)?.id || null;
        if (useCardId) {
          setCardIdEff(useCardId);
          if (Array.isArray((cardRow as any).reanalysis_notes)) setPareceres((cardRow as any).reanalysis_notes);
          try { setCardAttachments(await listAttachments(useCardId)); } catch {}
          try {
            const can = (cardRow as any)?.tipo_instalacao as string | null | undefined;
            const mapBack: any = { casa:'Casa', predio_com_prumada:'Prédio com Prumada', predio_sem_prumada:'Prédio sem Prumada', 'wifi_extend':'Wi-Fi Extend' };
            setTipoInstalacao(can ? (mapBack[can] || '') : '');
          } catch {}
          // Carregar agendamento
          if ((cardRow as any)?.due_at) {
            const d = new Date((cardRow as any).due_at);
            setDueAt(d.toISOString().slice(0, 10));
          }
          if ((cardRow as any)?.hora_at) {
            const raw = (cardRow as any).hora_at;
            const arr = Array.isArray(raw) ? raw.map((h: string) => String(h).slice(0, 5)) : [String(raw).slice(0, 5)];
            setHoraAt(arr);
          }
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
          applyAppSnapshot(a2);
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
          applyPjSnapshot(p2);
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

  // Migrar rascunho 'self' -> user assim que tivermos currentUserId
  useEffect(() => {
    if (!cardIdEff) return;
    if (!currentUserId) return;
    (async () => {
      try {
        const selfKey = `parecer:${cardIdEff}:self`;
        const userKey = `parecer:${cardIdEff}:${currentUserId}`;
        const [selfDraft, userDraft] = await Promise.all([getDraft(selfKey), getDraft(userKey)]);
        const now = Date.now();
        const validSelf = selfDraft && now - (selfDraft as any).updated_at < 60*60*1000 ? (selfDraft as any) : null;
        const validUser = userDraft && now - (userDraft as any).updated_at < 60*60*1000 ? (userDraft as any) : null;
        if (validSelf) {
          const chosen = !validUser || (validSelf.updated_at > validUser.updated_at) ? validSelf : validUser;
          await saveDraft(userKey, chosen.value);
          await deleteDraft(selfKey);
        }
      } catch {}
    })();
  }, [cardIdEff, currentUserId]);

  // Hidratar composer com draft quando carregar
  useEffect(() => {
    const changed = cardIdEff && prevCardRef.current !== cardIdEff;
    if (changed) { hydratedOnceRef.current = false; prevCardRef.current = cardIdEff; }
    if (!cardIdEff) return;
    if (!draftLoaded) return;
    if (hydratedOnceRef.current) return;
    hydratedOnceRef.current = true;
    const nextVal: ComposerValue = { decision: parecerDraft?.decision ?? null, text: parecerDraft?.text ?? '', mentions: [] };
    setNovoParecer(nextVal);
    try { requestAnimationFrame(() => parecerComposerRef.current?.setValue(nextVal)); } catch {}
  }, [cardIdEff, draftLoaded, parecerDraft]);

  // Persistir draft no unload
  useEffect(() => {
    const onBeforeUnloadDraft = () => { try { saveDraft(draftKey, { text: novoParecer.text ?? '', decision: novoParecer.decision ?? null }); } catch {} };
    window.addEventListener('beforeunload', onBeforeUnloadDraft);
    return () => window.removeEventListener('beforeunload', onBeforeUnloadDraft);
  }, [draftKey, novoParecer.text, novoParecer.decision]);

  // Debounce alinhado ao modal (1.8s)
  const scheduleFlushRef = useRef<NodeJS.Timeout | null>(null);
  function scheduleFlush() {
    if (scheduleFlushRef.current) clearTimeout(scheduleFlushRef.current);
    scheduleFlushRef.current = setTimeout(() => { flushAutosave(); }, 1800);
  }

  async function flushAutosave() {
    if (isLeitor) {
      pendingApp.current = {};
      pendingPj.current = {};
      return;
    }
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
        (Object.keys(ap) as string[]).forEach((k) => { dirtyAppFields.current.delete(k as any); markFieldStatus(k, 'idle'); });
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
        (Object.keys(pp) as string[]).forEach((k) => { dirtyPjFields.current.delete(k as any); markFieldStatus(k, 'idle'); });
      }
      setSaving('saved'); setTimeout(()=> setSaving('idle'), 1200);
    } catch(e) {
      setSaving('error');
      (Object.keys(appPayload) as string[]).forEach((k) => markFieldStatus(k, 'error'));
      (Object.keys(pjPayload) as string[]).forEach((k) => markFieldStatus(k, 'error'));
    }
  }

  function queueSave(scope:'app'|'pj', key:string, value:any) {
    if (isLeitor) return;
    if (scope==='app') { pendingApp.current = { ...pendingApp.current, [key]: value }; dirtyAppFields.current.add(key as keyof AppModel); }
    else { pendingPj.current = { ...pendingPj.current, [key]: value }; dirtyPjFields.current.add(key as keyof PjModel); }
    markFieldStatus(key, 'pending');
    scheduleFlush();
  }

  const statusText = useMemo(() => (saving==='saving' ? 'Salvando…' : saving==='saved' ? 'Salvo' : saving==='error' ? 'Erro ao salvar' : ''), [saving]);

  

  

  // UI spacer height to keep bottom gap consistent when a parecer is pinned
  const [pinnedSpace, setPinnedSpace] = useState<number>(0);

  // Flush best-effort ao descarregar a página e onBlur global (via evento)
  useEffect(() => {
    const onBeforeUnload = () => { try { flushAutosave(); } catch {} };
    const onFieldBlur = () => { flushAutosave(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('mz-field-blur', onFieldBlur as any);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('mz-field-blur', onFieldBlur as any);
    };
  }, []);

  // Zoom control for PJ (persisted) — must be declared before any early return
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const s = window.localStorage.getItem('form-zoom-pj');
      if (!s) return 1;
      const n = parseFloat(s);
      return Number.isFinite(n) ? Math.min(1.5, Math.max(0.75, n)) : 1;
    } catch { return 1; }
  });
  useEffect(() => { try { window.localStorage.setItem('form-zoom-pj', String(zoom)); } catch {} }, [zoom]);

  if (loading) return <div className="p-4 text-sm text-zinc-600">Carregando…</div>;

  const reqComprov = (pj.enviou_comprovante||'') === 'Sim';

  const from = (search?.get('from') || '').toLowerCase();
  const showAnalyzeCrumb = from === 'analisar';
  // Wrapper receives .expanded-portrait para layout compacto
  // Aplica zoom escalável tipo Adobe: controles acima do primeiro card e scaler centralizado
  return (
    <div className="form-zoom-wrap" style={{ display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <ZoomPortal zoom={zoom} setZoom={setZoom} storageKey="form-zoom-pj" />
      <div
        className="form-zoom-scaler"
        style={{ zoom: zoom as any, margin: '0 auto', minHeight: 'fit-content', width: '100%' }}
      >
        <div
          id="mz-print-root"
          data-tipo="pj"
          data-id={applicantId}
          data-name={app.primary_name || ''}
          className={`pj-form ficha-pj px-3 py-6 expanded-portrait ${isLeitor ? "pointer-events-none opacity-85" : ""}`}
        >
          {statusText && (
            <div className="mb-4 text-sm font-medium" style={{ color: 'var(--verde-primario)' }}>{statusText}</div>
          )}

      {/* Ficha completa (dados, endereço, contatos, sócios, etc.) */}
      <Card title="">
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Field label="Razão Social" value={app.primary_name||''} onChange={(v)=>{ setApp({...app, primary_name:v}); queueSave('app','primary_name',v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('primary_name')} />
            <Field label="CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCnpj(v); setApp({...app, cpf_cnpj:m}); queueSave('app','cpf_cnpj',m); }} inputMode="numeric" maxLength={18} className="w-full sm:w-56 sm:shrink-0" status={getFieldStatus('cpf_cnpj')} />
            <Field label="ABERTURA" value={pj.data_abertura||''} onChange={(v)=>{ const m=formatDateBR(v); setPj({...pj, data_abertura:m}); queueSave('pj','data_abertura', m); }} inputMode="numeric" maxLength={10} className="w-full sm:w-44 sm:shrink-0" status={getFieldStatus('data_abertura')} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Field label="Nome Fantasia" value={pj.nome_fantasia||''} onChange={(v)=>{ setPj({...pj, nome_fantasia:v}); queueSave('pj','nome_fantasia', v); }} className="min-w-0" status={getFieldStatus('nome_fantasia')} />
            <Field label="Nome de Fachada" value={pj.nome_fachada||''} onChange={(v)=>{ setPj({...pj, nome_fachada:v}); queueSave('pj','nome_fachada', v); }} className="min-w-0" status={getFieldStatus('nome_fachada')} />
          </div>
          <Field label="Área de Atuação" value={pj.area_atuacao||''} onChange={(v)=>{ setPj({...pj, area_atuacao:v}); queueSave('pj','area_atuacao', v); }} className="w-full" status={getFieldStatus('area_atuacao')} />
        </div>
      {/* Seção 2: Endereço */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Field label="END" value={app.address_line||''} onChange={(v)=>{ setApp({...app, address_line:v}); queueSave('app','address_line', v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('address_line')} />
            <Field label="N" value={app.address_number||''} onChange={(v)=>{ setApp({...app, address_number:v}); queueSave('app','address_number', v); }} className="w-full sm:w-20 sm:shrink-0" status={getFieldStatus('address_number')} />
            <Field label="COMPL" value={app.address_complement||''} onChange={(v)=>{ setApp({...app, address_complement:v}); queueSave('app','address_complement', v); }} className="w-full sm:w-[250px] sm:shrink-0" status={getFieldStatus('address_complement')} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="field-inline w-full sm:w-56 sm:shrink-0">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Tipo</label>
              <SimpleSelect
                value={pj.tipo_imovel||''}
                onChange={(v)=>{ setPj({...pj, tipo_imovel:v}); queueSave('pj','tipo_imovel', v); }}
                options={["Comércio Terreo","Comércio Sala","Casa"]}
                className="mt-0"
                triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
            <Field label="OBS" value={pj.obs_tipo_imovel||''} onChange={(v)=>{ setPj({...pj, obs_tipo_imovel:v}); queueSave('pj','obs_tipo_imovel', v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('obs_tipo_imovel')} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Field label="CEP" value={app.cep||''} onChange={(v)=>{ const m = formatCep(v); setApp({...app, cep:m}); queueSave('app','cep', m); }} className="w-full sm:w-40 sm:shrink-0" status={getFieldStatus('cep')} />
            <div className="field-inline w-full sm:w-56 sm:shrink-0">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Bairro</label>
              <SimpleSelect
                value={app.bairro||''}
                onChange={(v)=>{ setApp({...app, bairro:v}); queueSave('app','bairro', v); }}
                options={routes.map(r => ({ label: r.name, value: r.name }))}
                placeholder="— selecione —"
                className="mt-0"
                triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
                contentStyle={{ zIndex: 9999 }}
              />
            </div>
            <Field label="TEMPO" value={pj.tempo_endereco||''} onChange={(v)=>{ setPj({...pj, tempo_endereco:v}); queueSave('pj','tempo_endereco', v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('tempo_endereco')} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="field-inline w-full sm:w-56 sm:shrink-0">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Estabelecimento</label>
              <SimpleSelect
                value={pj.tipo_estabelecimento||''}
                onChange={(v)=>{ setPj({...pj, tipo_estabelecimento:v}); queueSave('pj','tipo_estabelecimento', v); }}
                options={["Própria","Alugada","Cedida","Outros"]}
                className="mt-0"
                triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
            <Field label="OBS" value={pj.obs_estabelecimento||''} onChange={(v)=>{ setPj({...pj, obs_estabelecimento:v}); queueSave('pj','obs_estabelecimento', v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('obs_estabelecimento')} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Field label="TEL" value={app.phone||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, phone:m}); queueSave('app','phone', m); }} className="w-full sm:w-48 sm:shrink-0" status={getFieldStatus('phone')} />
            <Field label="WHATS" value={app.whatsapp||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, whatsapp:m}); queueSave('app','whatsapp', m); }} className="w-full sm:w-48 sm:shrink-0" status={getFieldStatus('whatsapp')} />
            <Field label="FONE NO PS" value={pj.fones_ps||''} onChange={(v)=>{ setPj({...pj, fones_ps:v}); queueSave('pj','fones_ps', v); }} red className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('fones_ps')} />
          </div>
          <Field label="END NO PS" value={pj.end_ps||''} onChange={(v)=>{ setPj({...pj, end_ps:v}); queueSave('pj','end_ps', v); }} red className="w-full" status={getFieldStatus('end_ps')} />
        </div>
      {/* Seção 3: Contatos e Documentos */}
        <div className="mt-4 space-y-2">
          <Field label="E-mail" value={app.email||''} onChange={(v)=>{ setApp({...app, email:v}); queueSave('app','email', v); }} className="w-full" status={getFieldStatus('email')} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="field-inline w-full sm:w-52 sm:shrink-0">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Comprovante</label>
              <SimpleSelect
                value={(pj.enviou_comprovante as any) || ''}
                onChange={(v)=>{ setPj({...pj, enviou_comprovante:v}); queueSave('pj','enviou_comprovante', v); if (v==='Não'){ setPj(prev=>({ ...prev, tipo_comprovante:'', nome_comprovante:'' })); queueSave('pj','tipo_comprovante',''); queueSave('pj','nome_comprovante',''); } }}
                options={["Sim","Não"]}
                className="mt-0"
                triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
            <div className="field-inline w-full sm:w-44 sm:shrink-0">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Tipo</label>
              <SimpleSelect
                value={pj.tipo_comprovante||''}
                onChange={(v)=>{ setPj({...pj, tipo_comprovante:v}); queueSave('pj','tipo_comprovante', v); }}
                options={["Energia","Agua","Internet","Outro"]}
                className="mt-0"
                triggerClassName={`h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600 ${!reqComprov ? 'opacity-50 pointer-events-none cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
            <Field label="Em Nome de" value={pj.nome_comprovante||''} onChange={(v)=>{ setPj({...pj, nome_comprovante:v}); queueSave('pj','nome_comprovante', v); }} disabled={!reqComprov} requiredMark={reqComprov} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('nome_comprovante')} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="field-inline w-full sm:w-44 sm:shrink-0">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Internet</label>
              <SimpleSelect
                value={(pj.possui_internet as any) || ''}
                onChange={(v)=>{ setPj({...pj, possui_internet:v}); queueSave('pj','possui_internet', v); }}
                options={["Sim","Não"]}
                className="mt-0"
                triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
            <Field label="Operadora" value={pj.operadora_internet||''} onChange={(v)=>{ setPj({...pj, operadora_internet:v}); queueSave('pj','operadora_internet', v); }} className="w-full sm:w-48 sm:shrink-0" status={getFieldStatus('operadora_internet')} />
            <Field label="Plano" value={pj.plano_internet||''} onChange={(v)=>{ setPj({...pj, plano_internet:v}); queueSave('pj','plano_internet', v); }} className="w-full sm:w-40 sm:shrink-0" status={getFieldStatus('plano_internet')} />
            <Field label="Valor" value={pj.valor_internet||''} onChange={(v)=>{ const m = formatCurrencyBR(v); setPj({...pj, valor_internet:m}); queueSave('pj','valor_internet', m); }} className="w-full sm:w-40 sm:shrink-0" status={getFieldStatus('valor_internet')} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="field-inline w-full sm:w-52 sm:shrink-0">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Contrato Social</label>
              <SimpleSelect
                value={(pj.contrato_social as any) || ''}
                onChange={(v)=>{ setPj({...pj, contrato_social:v}); queueSave('pj','contrato_social', v); }}
                options={["Sim","Não"]}
                className="mt-0"
                triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
            <Field label="OBS" value={pj.obs_contrato_social||''} onChange={(v)=>{ setPj({...pj, obs_contrato_social:v}); queueSave('pj','obs_contrato_social', v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('obs_contrato_social')} />
          </div>
        </div>
      {/* Seção 4: Sócios */}
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachmentInputChange}
        accept={ATTACHMENT_ALLOWED_TYPES.join(",")}
      />
      {/* Sócios */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 mb-1">Sócios</p>
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Field label="" value={pj.socio1_nome||''} onChange={(v)=>{ setPj({...pj, socio1_nome:v}); queueSave('pj','socio1_nome', v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('socio1_nome')} />
              <Field label="" value={pj.socio1_cpf||''} onChange={(v)=>{ setPj({...pj, socio1_cpf:v}); queueSave('pj','socio1_cpf', v); }} className="w-full sm:w-52 sm:shrink-0" status={getFieldStatus('socio1_cpf')} />
              <Field label="" value={pj.socio1_telefone||''} onChange={(v)=>{ setPj({...pj, socio1_telefone:v}); queueSave('pj','socio1_telefone', v); }} className="w-full sm:w-56 sm:shrink-0" status={getFieldStatus('socio1_telefone')} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Field label="" value={pj.socio2_nome||''} onChange={(v)=>{ setPj({...pj, socio2_nome:v}); queueSave('pj','socio2_nome', v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('socio2_nome')} />
              <Field label="" value={pj.socio2_cpf||''} onChange={(v)=>{ setPj({...pj, socio2_cpf:v}); queueSave('pj','socio2_cpf', v); }} className="w-full sm:w-52 sm:shrink-0" status={getFieldStatus('socio2_cpf')} />
              <Field label="" value={pj.socio2_telefone||''} onChange={(v)=>{ setPj({...pj, socio2_telefone:v}); queueSave('pj','socio2_telefone', v); }} className="w-full sm:w-56 sm:shrink-0" status={getFieldStatus('socio2_telefone')} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Field label="" value={pj.socio3_nome||''} onChange={(v)=>{ setPj({...pj, socio3_nome:v}); queueSave('pj','socio3_nome', v); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('socio3_nome')} />
              <Field label="" value={pj.socio3_cpf||''} onChange={(v)=>{ setPj({...pj, socio3_cpf:v}); queueSave('pj','socio3_cpf', v); }} className="w-full sm:w-52 sm:shrink-0" status={getFieldStatus('socio3_cpf')} />
              <Field label="" value={pj.socio3_telefone||''} onChange={(v)=>{ setPj({...pj, socio3_telefone:v}); queueSave('pj','socio3_telefone', v); }} className="w-full sm:w-56 sm:shrink-0" status={getFieldStatus('socio3_telefone')} />
            </div>
          </div>
        </div>
      {/* Seção 5: Solicitação */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Field label="Quem Solicitou" value={app.quem_solicitou||''} onChange={(v)=>{ setApp({...app, quem_solicitou:v}); queueSave('app','quem_solicitou', v); }} className="w-full sm:w-[250px] sm:shrink-0" status={getFieldStatus('quem_solicitou')} />
          <div className="field-inline w-full sm:w-[190px] sm:shrink-0">
            <label className="mb-1 block text-xs font-medium text-zinc-700">Meio</label>
            <SimpleSelect
              value={app.meio||''}
              onChange={(v)=>{ setApp({...app, meio:v}); queueSave('app','meio', v); }}
              options={[...MEIO_UI]}
              className="mt-0"
              triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
              contentClassName="rounded-lg shadow-lg border-0"
            />
          </div>
          <Field label="TEL" value={app.telefone_solicitante||''} onChange={(v)=>{ const m=maskPhone(v); setApp({...app, telefone_solicitante:m}); queueSave('app','telefone_solicitante', m); }} className="w-full sm:flex-1 sm:min-w-0" status={getFieldStatus('telefone_solicitante')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ── Bloco destacado: Plano / SVA / Vencimento / Data / Protocolo MK / Representante ── */}
          <div className="pj-highlight-row sm:col-span-2 lg:col-span-4 grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600">Plano de Acesso</label>
              <div className="flex-1 min-w-0">
                <SimpleSelect
                  value={app.plano_acesso||''}
                  onChange={(v)=>{ setApp({...app, plano_acesso:v}); queueSave('app','plano_acesso', v); }}
                  options={PLANO_OPTIONS as any}
                  className="mt-0"
                  triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
              <label className="shrink-0 text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600">Vencimento</label>
              <div className="w-20 shrink-0">
                <SimpleSelect
                  value={String(app.venc||'')}
                  onChange={(v)=>{ setApp({...app, venc:v}); queueSave('app','venc', v); }}
                  options={["5","10","15","20","25"]}
                  className="mt-0"
                  triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            <div className="field-inline">
              <label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600">SVA Avulso</label>
              <SimpleSelect
                value={app.sva_avulso||''}
                onChange={(v)=>{ setApp({...app, sva_avulso:v}); queueSave('app','sva_avulso', v); }}
                options={SVA_OPTIONS as any}
                className="mt-0"
                triggerClassName="h-10 w-full rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Data" value={app.created_at ? (()=>{ const d=new Date(app.created_at!); const dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'), aa=String(d.getFullYear()).slice(-2), hh=String(d.getHours()).padStart(2,'0'), min=String(d.getMinutes()).padStart(2,'0'); return `${dd}/${mm}/${aa} ${hh}:${min}`; })()||"" : ""} onChange={()=>{}} disabled status="idle" />
              <Field label="Protocolo MK" value={app.protocolo_mk||''} onChange={(v)=>{ setApp({...app, protocolo_mk:v}); queueSave('app','protocolo_mk', v); }} status={getFieldStatus('protocolo_mk')} />
              <Field label="Representante Mz" value={app.representante_mz || ""} onChange={()=>{}} disabled status="idle" />
            </div>
          </div>
          {/* Agendamento: Instalação agendada para + Horário */}
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2 min-w-0">
            <label className="shrink-0 text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600">Agendada</label>
            <div className="flex-1 min-w-0">
              <DateSingleKanbanPopover
                value={dueAt}
                onChange={(v) => {
                  setDueAt(v || '');
                  if (cardIdEff) {
                    const dueAtIso = v ? new Date(v + 'T12:00:00').toISOString() : null;
                    supabase.from('kanban_cards').update({ due_at: dueAtIso }).eq('id', cardIdEff).then(() => {});
                  }
                }}
                disablePast
                triggerClassName="h-[21px] w-full rounded-[2px] border border-zinc-400 bg-blue-100 px-1 text-[10px] text-zinc-900 outline-none focus:border-zinc-600"
              />
            </div>
            <label className="shrink-0 text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600">Horário</label>
            <div className="flex-1 min-w-0">
              <TimeMultiSelect
                label=""
                times={TIME_SLOTS}
                value={horaAt}
                onApply={(v) => {
                  setHoraAt(v);
                  if (cardIdEff) {
                    const horaAtDb = v.length > 0 ? v.map((s) => s + ':00') : null;
                    supabase.from('kanban_cards').update({ hora_at: horaAtDb }).eq('id', cardIdEff).then(() => {});
                  }
                }}
                allowedPairs={[["08:30", "10:30"], ["13:30", "15:30"]]}
                triggerClassName="h-[21px] w-full rounded-[2px] border border-zinc-400 bg-blue-100 px-1 text-[10px] text-zinc-900 outline-none focus:border-zinc-600"
                date={dueAt}
              />
            </div>
          </div>
        </div>
      {/* Seção 6: Informações Relevantes da Solicitação */}
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Informações relevantes da solicitação" value={app.info_relevantes||''} onChange={(v)=>{ setApp({...app, info_relevantes:v}); queueSave('app','info_relevantes', v); }} status={getFieldStatus('info_relevantes')} shrinkMin={2.5} />
        </div>

      {/* Seção 7: Consulta SPC/SERASA */}
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Consulta SPC/Serasa" value={app.info_spc||''} onChange={(v)=>{ setApp({...app, info_spc:v}); queueSave('app','info_spc', v); }} red status={getFieldStatus('info_spc')} />
        </div>

      {/* Seção 8: Outras Informações Relevantes do PS */}
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Outras informações relevantes do PS" value={app.info_pesquisador||''} onChange={(v)=>{ setApp({...app, info_pesquisador:v}); queueSave('app','info_pesquisador', v); }} red status={getFieldStatus('info_pesquisador')} />
        </div>

      {/* Seção 9: Informações Relevantes do MK */}
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Informações Relevantes do MK" value={app.info_mk||''} onChange={(v)=>{ setApp({...app, info_mk:v}); queueSave('app','info_mk', v); }} red status={getFieldStatus('info_mk')} />
        </div>
      </Card>

      {(
        <Card title="Parecer da análise:" noBorder red>
          <div className="space-y-4">
            <div className="relative" ref={parecerContainerRef}>
              <UnifiedComposer
                ref={parecerComposerRef}
                className="composer-root--blue"
                placeholder="Escreva um novo parecer… Use @ para mencionar, / para comandos"
                ariaLabel="Escrever parecer"
                richText
                disabled={!canWriteParecer}
                enablePasteAttachment={canWriteParecer}
                enableDropAttachment={canWriteParecer}
                hasPendingAttachments={parecerPendingFiles.length > 0}
                onFilesDropped={addParecerFiles}
                onFilesPasted={addParecerFiles}
                onAcceptMention={(query) => {
                  const list = (profiles||[]).filter(p => (p.full_name||'').toLowerCase().includes((query||'').toLowerCase()));
                  if (list.length === 1) {
                    parecerComposerRef.current?.insertMention({ id: list[0].id, label: list[0].full_name });
                    setMentionOpenParecer(false);
                    setMentionFilterParecer('');
                    return true;
                  }
                  return false;
                }}
                onAcceptCommand={(query) => {
                  if (!canWriteParecer) return false;
                  const opts = ['aprovado','negado','reanalise','anexo'].filter(k => k.includes((query||'').toLowerCase()));
                  if (opts.length === 1) {
                    setCmdOpenParecer(false); setCmdQueryParecer('');
                    if (opts[0] === 'anexo') {
                      parecerAttachInputRef.current?.click();
                      const clean = novoParecer.text.replace(/\s*\/[\w]*$/, '').trimEnd();
                      const next = { ...novoParecer, text: clean };
                      setNovoParecer(next);
                      parecerComposerRef.current?.setValue(next);
                    } else {
                      parecerComposerRef.current?.setDecision(opts[0] as any);
                    }
                    return true;
                  }
                  return false;
                }}
                onChange={(val)=> { setNovoParecer(val); try { setParecerDraft({ text: val.text ?? '', decision: val.decision ?? null }); } catch {} }}
                onSubmit={!canWriteParecer ? undefined : handleSubmitParecer}
                onCancel={()=> {
                  setCmdOpenParecer(false);
                  setMentionOpenParecer(false);
                }}
                onMentionTrigger={(query, rect)=> {
                  setMentionFilterParecer((query||'').trim());
                  if (rect && parecerContainerRef.current) {
                    const host = parecerContainerRef.current.getBoundingClientRect();
                    const top = (rect.bottom ?? (rect.top + (rect.height||0))) - host.top;
                    const left = (rect.left ?? host.left) - host.left;
                    setMentionAnchorParecer({ top, left, height: rect.height });
                  }
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
              {canWriteParecer && parecerPendingFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {parecerPendingFiles.map((f, i) => (
                    <PendingFileChip
                      key={i}
                      file={f}
                      onRemove={() => setParecerPendingFiles(prev => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              )}
              {mentionOpenParecer && (
                <div className="absolute z-50" style={{ left: Math.max(0, (mentionAnchorParecer?.left||0)), top: Math.max(0, (mentionAnchorParecer?.top||0)) }}>
                  <MentionDropdown
                    items={profiles.filter((p)=> p.id !== currentUserId && (p.full_name||'').toLowerCase().includes(mentionFilterParecer.toLowerCase()))}
                    onPick={(p)=> {
                      parecerComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                      setMentionOpenParecer(false);
                      setMentionFilterParecer("");
                    }}
                  />
                </div>
              )}
              {cmdOpenParecer && canWriteParecer && (
                <div className="absolute z-50 left-0 bottom-full mb-2">
                  <CmdDropdown
                    items={[
                      { key:'aprovado', label:'Aprovado' },
                      { key:'negado', label:'Negado' },
                      { key:'reanalise', label:'Reanálise' },
                      { key:'anexo', label:'Anexo' },
                    ].filter(i=> i.key.includes(cmdQueryParecer) || i.label.toLowerCase().includes(cmdQueryParecer))}
                    onPick={async (key)=>{
                      setCmdOpenParecer(false); setCmdQueryParecer('');
                      if (key==='aprovado' || key==='negado' || key==='reanalise') {
                        parecerComposerRef.current?.setDecision(key as ComposerDecision);
                        return;
                      } else if (key === 'anexo') {
                        parecerAttachInputRef.current?.click();
                        const clean = novoParecer.text.replace(/\s*\/[\w]*$/, '').trimEnd();
                        const next = { ...novoParecer, text: clean };
                        setNovoParecer(next);
                        parecerComposerRef.current?.setValue(next);
                      }
                    }}
                    initialQuery={cmdQueryParecer}
                  />
                </div>
              )}
              <input
                ref={parecerAttachInputRef}
                type="file"
                multiple
                className="hidden"
                accept={ATTACHMENT_ALLOWED_TYPES.join(',')}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = '';
                  addParecerFiles(files);
                }}
              />
            </div>

            <div className="portrait-pareceres-scroll">
            <PareceresList
              cardId={cardIdEff}
              notes={pareceres as any}
              attachments={cardAttachments}
              profiles={profiles}
              canWrite={canWriteParecer}
              currentUserId={currentUserId}
              onReply={async (pid, value) => {
                if (!canWriteParecer) return null;
                const text = (value.text || '').trim();
                const hasDecision = !!value.decision;
                const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
                const { data: rpcData } = await supabase.rpc('add_parecer', {
                  p_card_id: cardIdEff,
                  p_text: payloadText,
                  p_parent_id: pid,
                  p_decision: value.decision ?? null,
                });
                await refreshReanalysisNotes(cardIdEff);
                const notes = (rpcData as any)?.reanalysis_notes || [];
                const newNote = [...notes].reverse().find((n: any) => n.parent_id === pid && !n.deleted);
                return newNote?.id ?? null;
              }}
              onEdit={async (id, value) => {
                if (!canWriteParecer) return;
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
                if (!canWriteParecer) return;
                await supabase.rpc('delete_parecer', { p_card_id: cardIdEff, p_note_id: id });
                await refreshReanalysisNotes(cardIdEff);
              }}
              onDecisionChange={syncDecisionStatus}
              onAttachmentUploaded={refreshAttachments}
              onPinnedChange={(active, h) => setPinnedSpace(active ? h : 0)}
            />
            </div>
          </div>
        </Card>
      )}
      {pinnedSpace>0 && (<div aria-hidden className="w-full" style={{ height: pinnedSpace }} />)}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, noBorder, red }: { title: string; children: React.ReactNode; noBorder?: boolean; red?: boolean }) {
  return (
    <div className="mb-3">
      {title && (
        <div className={noBorder ? "pb-[3px] mb-2" : "pj-card-header"}>
          <span
            className={red ? "pj-card-marker-title font-bold uppercase tracking-[0.06em] underline" : "text-[9px] font-bold uppercase tracking-widest text-zinc-700"}
            style={red ? { fontSize: '12px', color: '#dc2626' } : undefined}
          >{title}</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, className, error, red, requiredMark, disabled, maxLength, inputMode, status }: { label: string; value: string; onChange: (v:string)=>void; className?: string; error?: boolean; red?: boolean; requiredMark?: boolean; disabled?: boolean; maxLength?: number; inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"]; status?: 'idle'|'pending'|'error' }) {
  return (
    <div className={className}>
      <div className="field-inline">
        <label className={`text-[9px] font-bold uppercase tracking-wide leading-none${red ? ' label-red' : ' text-zinc-600'}`}>
          {label}
        </label>
        <input
          value={value}
          onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
          onBlur={()=>{ try { window.dispatchEvent(new CustomEvent('mz-field-blur')); } catch {} }}
          disabled={disabled}
          maxLength={maxLength}
          inputMode={inputMode}
          className={`h-[21px] w-full rounded-[2px] border ${error || red ? 'border-red-400 bg-red-50' : requiredMark && !disabled ? 'border-emerald-500 bg-emerald-50 placeholder:text-emerald-600 placeholder:font-semibold' : 'border-zinc-400 bg-blue-100'} px-1 text-[10px] outline-none focus:border-zinc-600 ${disabled ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'text-zinc-900'}${red && !disabled ? ' input-red' : ''}`}
          placeholder={requiredMark && !disabled ? "Obrigatório" : ""}
          autoComplete="off"
        />
      </div>
      <FieldStatusIndicator status={status || 'idle'} />
    </div>
  );
}

function Textarea({ label, value, onChange, red, error, requiredMark, disabled, status, shrinkMin = 6 }: { label: string; value: string; onChange: (v:string)=>void; red?: boolean; error?: boolean; requiredMark?: boolean; disabled?: boolean; status?: 'idle'|'pending'|'error'; shrinkMin?: number }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    const MAX_FONT = 13;
    const STEP = 0.5;
    el.style.fontSize = `${MAX_FONT}px`;
    el.style.overflowY = 'hidden';
    let size = MAX_FONT;
    while (el.scrollHeight > el.clientHeight && size > shrinkMin) {
      size = Math.max(shrinkMin, size - STEP);
      el.style.fontSize = `${size}px`;
    }
    el.style.overflowY = el.scrollHeight > el.clientHeight ? 'auto' : 'hidden';
  }, [value, shrinkMin]);
  return (
    <div>
      <div className="border-b border-zinc-500 mb-1 pb-0.5">
        <label className={`pj-section-title${red ? ' label-red' : ''}`}>{label}</label>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
        onBlur={()=>{ try { window.dispatchEvent(new CustomEvent('mz-field-blur')); } catch {} }}
        disabled={disabled}
        className={`min-h-[52px] w-full rounded-[2px] border ${error || red ? 'border-red-300 bg-red-50' : requiredMark && !disabled ? 'border-emerald-500 bg-emerald-50 placeholder:text-emerald-600 placeholder:font-semibold' : 'border-zinc-300 bg-blue-100'} px-1.5 py-1 text-[10px] outline-none ${red ? 'text-red-700' : 'text-zinc-900'} resize-none`}
        placeholder={requiredMark && !disabled ? "Obrigatório" : ""}
      />
      <FieldStatusIndicator status={status || 'idle'} />
    </div>
  );
}

type Opt = string | { label: string; value: string; disabled?: boolean };
function Select({ label, value, onChange, options, error, disabled, className, requiredMark }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[]; error?: boolean; disabled?: boolean; className?: string; requiredMark?: boolean }) {
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
        onBlur={()=>{ try { window.dispatchEvent(new CustomEvent('mz-field-blur')); } catch {} }}
        disabled={disabled}
        className={`h-10 w-full rounded-[7px] border px-3 text-sm outline-none shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-zinc-200' : error ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-300 text-zinc-900' : requiredMark ? 'border-emerald-500 bg-emerald-50 text-zinc-900 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600'}`}
      >
        {norm.map((opt, idx) => (
          <option key={opt.value+idx} value={opt.value} disabled={!!opt.disabled}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function FieldStatusIndicator({ status }: { status: 'idle'|'pending'|'error' }) {
  if (status !== 'error') return null;
  return (
    <div className="mt-1 text-xs h-4 flex items-center gap-1">
      <span className="text-red-500">Erro ao salvar</span>
    </div>
  );
}

// ================= Parecer helpers (copied UI from EditarFicha) =================
function CmdDropdown({ items, onPick, initialQuery }: { items: { key: string; label: string }[]; onPick: (key: string) => void | Promise<void>; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery || "");
  useEffect(()=> setQ(initialQuery || ""), [initialQuery]);
  const listboxId = useMemo(()=> `cmd-list-${Math.random().toString(36).slice(2)}`, []);
  const iconFor = (key: string) => {
    if (key === 'aprovado') return <CheckCircle className="w-4 h-4" />;
    if (key === 'negado') return <XCircle className="w-4 h-4" />;
    if (key === 'reanalise') return <RefreshCcw className="w-4 h-4" />;
    if (key === 'anexo') return <Paperclip className="w-4 h-4" />;
    return null;
  };
  const filtered = items.filter(i => i.key.includes(q) || i.label.toLowerCase().includes(q.toLowerCase()));
  const decisions = filtered.filter(i => ['aprovado','negado','reanalise'].includes(i.key));
  const actions = filtered.filter(i => ['anexo'].includes(i.key));
  const firstId = filtered[0]?.key ? `cmd-opt-${filtered[0].key}` : undefined;
  const srOnly = { position:'absolute', width:'1px', height:'1px', padding:0, margin:'-1px', overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap', border:0 } as React.CSSProperties;
  return (
    <div className="cmd-menu-dropdown mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow" role="listbox" aria-label="Sugestões de comando" id={listboxId} aria-activedescendant={firstId}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input role="combobox" aria-autocomplete="list" aria-controls={listboxId} aria-expanded={true} aria-activedescendant={firstId} value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
        <div style={srOnly} aria-live="polite">{filtered.length} resultado{filtered.length===1?'':'s'}</div>
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
              role="option"
              id={`cmd-opt-${i.key}`}
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
            <button key={i.key} onClick={() => onPick(i.key)} className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left" role="option" id={`cmd-opt-${i.key}`}>
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

function ZoomPortal({ zoom, setZoom, storageKey }: { zoom: number; setZoom: (fn: (z: number) => number) => void; storageKey: string }) {
  const [target, setTarget] = useState<Element | null>(null);
  useEffect(() => { setTarget(document.getElementById('mz-zoom-controls')); }, []);
  if (!target) return null;
  return createPortal(
    <div className="flex items-center gap-1">
      <button className="btn-zoom" onClick={() => setZoom(z => Math.max(0.75, +(z - 0.05).toFixed(2)))}>−</button>
      <span className="zoom-label">{Math.round(zoom * 100)}%</span>
      <button className="btn-zoom" onClick={() => setZoom(z => Math.min(1.5, +(z + 0.05).toFixed(2)))}>+</button>
    </div>,
    target
  );
}
