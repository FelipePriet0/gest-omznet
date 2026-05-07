"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent, useCallback } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useParams, useSearchParams } from "next/navigation";
import { SimpleSelect } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { Textarea as UITTextarea } from "@/components/ui/textarea";
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
import { FEATURES } from "@/lib/features";
//

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

// Auto-print quando aberto em modo de exportação
function useAutoPrintOnExport() {
  const sp = useSearchParams();
  useEffect(() => {
    const isExport = (sp.get('from') || '').toLowerCase() === 'export';
    const doPrint = (sp.get('print') || '') === '1';
    if (!isExport || !doPrint) return;
    const t = setTimeout(() => { try { window.print(); } catch {} }, 400);
    return () => clearTimeout(t);
  }, [sp]);
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
  venc?: string;
  sva_avulso?: string;
  carne_impresso?: boolean;
  quem_solicitou?: string;
  telefone_solicitante?: string;
  protocolo_mk?: string;
  meio?: string;
  representante_mz?: string;
  created_at?: string;
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
  locador_obs?: string;
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
// Wrapper para compatibilidade com chamadas existentes
function maskPhoneLoose(input: string) { return maskPhone(input); }
// Mapeamentos UI <-> Canônico (após migration)
const BOOL_UI = { Sim: true, Não: false } as const;
function uiToBool(v: any): boolean|null { if (v === 'Sim') return true; if (v === 'Não') return false; return null; }
function boolToUI(b: any): string { return b === true ? 'Sim' : b === false ? 'Não' : ''; }

const TIPO_MORADIA_UI = ['Própria','Alugada','Cedida','Outros'] as const;
function uiToTipoMoradia(v: string): string|null { const m: any = { 'Própria':'propria','Alugada':'alugada','Cedida':'cedida','Outros':'outros' }; return m[v] ?? null; }
function tipoMoradiaToUI(v: string|null): string { const m: any = { propria:'Própria', alugada:'Alugada', cedida:'Cedida', outros:'Outros' }; return v ? (m[v] ?? '') : ''; }

const NAS_OUTRAS_UI = ['XXXXX','Parentes','Locador(a)','Só conhecidos','Não conhece'] as const;
function uiToNasOutras(v: string): string|null { const m:any={ 'XXXXX':'xxxxx','Parentes':'parentes','Locador(a)':'locador','Só conhecidos':'so_conhecidos','Não conhece':'nao_conhece' }; return m[v] ?? null; }
function nasOutrasToUI(v: string|null): string { const m:any={ 'xxxxx':'XXXXX',parentes:'Parentes',locador:'Locador(a)','so_conhecidos':'Só conhecidos','nao_conhece':'Não conhece' }; return v ? (m[v] ?? '') : ''; }

const TIPO_COMPROV_UI = ['Energia','Agua','Internet','Outro'] as const;
function uiToTipoComprov(v:string): string|null { const m:any={ Energia:'energia',Agua:'agua',Internet:'internet',Outro:'outro' }; return m[v] ?? null; }
function tipoComprovToUI(v:string|null): string { const m:any={ energia:'Energia',agua:'Agua',internet:'Internet',outro:'Outro' }; return v ? (m[v] ?? '') : ''; }

const VINCULO_UI = ['Carteira Assinada','Presta Serviços','Contrato de Trabalho','Autonômo','Concursado','Outro'] as const;
function uiToVinculo(v:string): string|null { const m:any={ 'Carteira Assinada':'carteira_assinada','Presta Serviços':'presta_servicos','Contrato de Trabalho':'contrato_trabalho','Autonômo':'autonomo','Concursado':'concursado','Outro':'outro' }; return m[v] ?? null; }
function vinculoToUI(v:string|null): string { const m:any={ carteira_assinada:'Carteira Assinada',presta_servicos:'Presta Serviços',contrato_trabalho:'Contrato de Trabalho',autonomo:'Autonômo',concursado:'Concursado',outro:'Outro' }; return v ? (m[v] ?? '') : ''; }

const ESTADO_CIVIL_UI = ['Solteiro(a)','Casado(a)','Amasiado(a)','Separado(a)','Viuvo(a)'] as const;

const TIPO_INST_UI = ['Casa','Prédio com Prumada','Prédio sem Prumada','Wi-Fi Extend'] as const;
function uiToTipoInst(v: string): string | null { const m: any = { 'Casa':'casa','Prédio com Prumada':'predio_com_prumada','Prédio sem Prumada':'predio_sem_prumada','Wi-Fi Extend':'wifi_extend' }; return m[v] ?? null; }
function tipoInstToUI(v: string | null): string { const m: any = { casa:'Casa',predio_com_prumada:'Prédio com Prumada',predio_sem_prumada:'Prédio sem Prumada',wifi_extend:'Wi-Fi Extend' }; return v ? (m[v] ?? '') : ''; }
function uiToEstadoCivil(v:string): string|null { const m:any={ 'Solteiro(a)':'solteiro','Casado(a)':'casado','Amasiado(a)':'amasiado','Separado(a)':'separado','Viuvo(a)':'viuvo' }; return m[v] ?? null; }
function estadoCivilToUI(v:string|null): string { const m:any={ solteiro:'Solteiro(a)',casado:'Casado(a)',amasiado:'Amasiado(a)',separado:'Separado(a)',viuvo:'Viuvo(a)' }; return v ? (m[v] ?? '') : ''; }

const MEIO_UI = ['Ligação','Whatspp','Presensicial','Whats - Uber'] as const;
function uiToMeio(v:string): string|null { const m:any={ 'Ligação':'ligacao','Whatspp':'whatsapp','Presensicial':'presencial','Whats - Uber':'whats_uber' }; return m[v] ?? null; }
function meioToUI(v:string|null): string { const m:any={ ligacao:'Ligação',whatsapp:'Whatspp',presencial:'Presensicial',whats_uber:'Whats - Uber' }; return v ? (m[v] ?? '') : ''; }
function formatCep(input: string) {
  const d = digitsOnly(input).slice(0,8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5)}`;
}

export default function CadastroPFPage() {
  useAutoPrintOnExport();
  const params = useParams();
  const applicantId = params?.id as string;
  const [routes, setRoutes] = useState<Route[]>([]);
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
  const [tipoInstalacao, setTipoInstalacao] = useState<string>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [horaAt, setHoraAt] = useState<string[]>([]);
  const showAnalyzeCrumb = from === 'analisar';
  // Parecer states
  const [pareceres, setPareceres] = useState<any[]>([]);
  const [cardAttachments, setCardAttachments] = useState<CardAttachment[]>([]);
  const [parecerPendingFiles, setParecerPendingFiles] = useState<File[]>([]);
  const parecerAttachInputRef = useRef<HTMLInputElement | null>(null);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const currentUserRoleRef = useRef<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
  const [pinnedSpace, setPinnedSpace] = useState<number>(0);
  // Draft de parecer (consistente com o modal)
  const draftKey = useMemo(() => `parecer:${cardIdEff || ''}:${currentUserId ?? 'self'}`, [cardIdEff, currentUserId]);
  const [parecerDraft, setParecerDraft, clearParecerDraft, draftLoaded] = useIndexedDraft<{ text: string; decision: ComposerDecision | null }>(draftKey, { text: '', decision: null });
  const hydratedOnceRef = useRef(false);
  const prevCardRef = useRef<string | null>(null);
  // Dirty tracking e status por campo (para evitar sobrescrever durante digitação)
  const dirtyAppFields = useRef<Set<keyof AppModel>>(new Set());
  const dirtyPfFields = useRef<Set<keyof PfModel>>(new Set());
  const fieldStatus = useRef<Record<string, "idle" | "pending" | "error">>({});
  const [, forceStatusRender] = useState(0);

  const markFieldStatus = useCallback((key: string, status: "idle" | "pending" | "error") => {
    fieldStatus.current[key] = status;
    // força re-render para refletir status global
    forceStatusRender((v) => v + 1);
  }, []);

  const applyAppSnapshot = useCallback((next: Partial<AppModel> | null | undefined) => {
    if (!next) return;
    setApp((prev) => {
      const merged: AppModel = { ...prev };
      (Object.keys(next) as (keyof AppModel)[]).forEach((k) => {
        if (dirtyAppFields.current.has(k)) return;
        const val = next[k];
        if (typeof val === "undefined") return;
        (merged as any)[k] = val as any;
      });
      return merged;
    });
  }, []);

  const applyPfSnapshot = useCallback((next: Partial<PfModel> | null | undefined) => {
    if (!next) return;
    setPf((prev) => {
      const merged: PfModel = { ...prev };
      (Object.keys(next) as (keyof PfModel)[]).forEach((k) => {
        if (dirtyPfFields.current.has(k)) return;
        const val = next[k];
        if (typeof val === "undefined") return;
        (merged as any)[k] = val as any;
      });
      return merged;
    });
  }, []);

  const getFieldStatus = useCallback((key: string) => fieldStatus.current[key] || 'idle', []);

  useEffect(() => {
    currentUserRoleRef.current = currentUserRole;
  }, [currentUserRole]);

  function triggerAttachmentPicker(context?: { source?: "parecer" }) {
    if (currentUserRoleRef.current === "leitor") return;
    attachmentContextRef.current = context ?? null;
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
      attachmentInputRef.current.click();
    }
  }

  async function processAttachmentSelection(files: File[]) {
    if (currentUserRoleRef.current === "leitor") return;
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
    if (currentUserRoleRef.current === "leitor") return;
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
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        const uid = data.user?.id;
        if (!uid) {
          setCurrentUserRole(null);
          return;
        }
        const profile = (await listProfiles()).find((p) => p.id === uid);
        setCurrentUserRole(profile?.role ?? null);
      } catch {
        if (active) setCurrentUserRole(null);
      }
    })();

    function handleOpenAttach(event?: Event) {
      const detail = (event as CustomEvent<{ source?: "parecer" }> | undefined)?.detail;
      triggerAttachmentPicker({
        source: detail?.source ?? "parecer",
      });
    }
    window.addEventListener("mz-open-attach", handleOpenAttach);
    return () => {
      active = false;
      window.removeEventListener("mz-open-attach", handleOpenAttach);
    };
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

  const refreshAttachments = useCallback(async () => {
    if (!cardIdEff) return;
    try { setCardAttachments(await listAttachments(cardIdEff)); } catch {}
  }, [cardIdEff]);

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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        // ensure auth
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || null;
        setCurrentUserId(userId);
        // Load applicants
        const { data: a, error: errA } = await supabase
          .from("applicants")
          .select("primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, quem_solicitou, telefone_solicitante, protocolo_mk, meio, info_spc, info_pesquisador, info_relevantes, info_mk, parecer_analise, representante_mz, created_at")
          .eq("id", applicantId)
          .single();
        if (!active) return;
        const a2: any = { ...(a||{}) };
        if (a2 && typeof a2.meio !== 'undefined' && a2.meio !== null) a2.meio = meioToUI(a2.meio);
        if (a2 && typeof a2.venc !== 'undefined' && a2.venc !== null) a2.venc = String(a2.venc);
        applyAppSnapshot(a2 || {});

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
        ['tem_contrato','enviou_contrato','enviou_comprovante','tem_internet_fixa','unica_no_lote'].forEach((k:any) => {
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
        applyPfSnapshot(pfix || {});

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
          setTipoInstalacao(tipoInstToUI((cardRow as any)?.tipo_instalacao ?? null));
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
          applyAppSnapshot(a2);
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
          applyPfSnapshot(pfix);
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

  // Debounce alinhado ao modal (1.8s)
  const scheduleFlushRef = useRef<NodeJS.Timeout | null>(null);
  function scheduleFlush() {
    if (scheduleFlushRef.current) clearTimeout(scheduleFlushRef.current);
    scheduleFlushRef.current = setTimeout(() => { flushAutosave(); }, 1800);
  }

  async function flushAutosave() {
    if (currentUserRoleRef.current === "leitor") {
      pendingApp.current = {};
      pendingPf.current = {};
      return;
    }
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
        (Object.keys(appPatch) as string[]).forEach((k) => { dirtyAppFields.current.delete(k as any); markFieldStatus(k, "idle"); });
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
        (Object.keys(patch) as string[]).forEach((k) => { dirtyPfFields.current.delete(k as any); markFieldStatus(k, "idle"); });
      }
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1200);
    } catch (e) {
      setSaving("error");
      (Object.keys(appPayload) as string[]).forEach((k) => markFieldStatus(k, "error"));
      (Object.keys(pfPayload) as string[]).forEach((k) => markFieldStatus(k, "error"));
    }
  }

  function queueSave(scope: "app"|"pf", key: string, value: any) {
    if (currentUserRoleRef.current === "leitor") return;
    if (scope === "app") { pendingApp.current = { ...pendingApp.current, [key]: value }; dirtyAppFields.current.add(key as keyof AppModel); }
    else { pendingPf.current = { ...pendingPf.current, [key]: value }; dirtyPfFields.current.add(key as keyof PfModel); }
    markFieldStatus(key, "pending");
    scheduleFlush();
  }

  const statusText = useMemo(() => (
    saving === "saving" ? "Salvando…" : saving === "saved" ? "Salvo" : saving === "error" ? "Erro ao salvar" : ""
  ), [saving]);

  

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

  // Zoom control (Adobe-like proportional zoom) — must be declared before any early return
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const s = window.localStorage.getItem('form-zoom-pf');
      if (!s) return 1;
      const n = parseFloat(s);
      return Number.isFinite(n) ? Math.min(1.5, Math.max(0.75, n)) : 1;
    } catch { return 1; }
  });
  useEffect(() => { try { window.localStorage.setItem('form-zoom-pf', String(zoom)); } catch {} }, [zoom]);

  if (loading) return <div className="p-4 text-sm text-zinc-600">Carregando…</div>;

  // Validações condicionais
  const reqLocador = (pf.tipo_moradia || '').toLowerCase() === 'alugada';
  const reqEnviouContrato = (pf.tem_contrato || '') === 'Sim';
  const reqNomeDe = reqEnviouContrato && (pf.enviou_contrato || '') === 'Sim';
  const isReadOnly = currentUserRole === "leitor";
  const canWriteParecer = !isReadOnly && currentUserRole !== "vendedor" && currentUserRole !== "instalador";

  const errs = {
    nome_locador: reqLocador && !(pf.nome_locador || '').trim(),
    telefone_locador: reqLocador && !(pf.telefone_locador || '').trim(),
    enviou_contrato: reqEnviouContrato && !(pf.enviou_contrato || '').trim(),
    nome_de: reqNomeDe && !(pf.nome_de || '').trim(),
  } as const;

  // Wrapper receives .expanded-portrait for compact layout on tall portrait monitors
  // Apply PF aspect (407/670) and responsive sizing with `.ficha-pf` and smart zoom scaler
  return (
    <div className="form-zoom-wrap" style={{ display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <ZoomPortal zoom={zoom} setZoom={setZoom} />
      <div className="form-zoom-scaler" style={{ zoom: zoom, margin: '0 auto', minHeight: 'fit-content', width: '100%' }}>
        <div
          id="mz-print-root"
          data-tipo="pf"
          data-id={applicantId}
          data-name={app.primary_name || ''}
          className={`mz-form ficha-pf px-3 py-6 expanded-portrait ${isReadOnly ? "pointer-events-none opacity-85" : ""}`}
        >
          <div className="mb-4 h-5 text-sm font-medium" style={{ color: 'var(--verde-primario)', opacity: statusText ? 1 : 0 }}>{statusText || ' '}</div>

      {/* Ficha completa (dados, endereço, residência, etc.) — sem título, como no Adobe */}
      <Card>
        {/* Linha 1: Nome | CPF | Nasc | ID */}
        <div className="flex gap-x-[5px]">
          <Field label="Nome" className="flex-[24] min-w-0" value={app.primary_name || ""} onChange={(v)=>{ setApp({...app, primary_name:v}); queueSave("app","primary_name", v); }} status={getFieldStatus('primary_name')} />
          <Field label="CPF" className="flex-[8] min-w-0" value={app.cpf_cnpj || ""} onChange={(v)=>{ setApp({...app, cpf_cnpj:v}); queueSave("app","cpf_cnpj", v); }} status={getFieldStatus('cpf_cnpj')} />
          <Field label="Nasc" className="flex-[6] min-w-0" value={pf.birth_date ? formatDateBR(pf.birth_date as any) : ""} onChange={(v)=>{ setPf({...pf, birth_date: v}); queueSave("pf","birth_date", v); }} status={getFieldStatus('birth_date')} />
          <Field label="ID" className="flex-[3] min-w-0" value={pf.idade || ""} onChange={(v)=>{ setPf({...pf, idade:v}); queueSave('pf','idade', v); }} maxLength={2} status={getFieldStatus('idade')} />
        </div>
        {/* Linha 2: Tel | Whats | Do PS */}
        <div className="mt-4 flex gap-x-[5px] items-start">
          <Field label="Tel" className="flex-[13] min-w-0" value={app.phone || ""} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, phone:m}); queueSave("app","phone", m); }} status={getFieldStatus('phone')} />
          <Field label="Whats" className="flex-[13] min-w-0" value={app.whatsapp || ""} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, whatsapp:m}); queueSave("app","whatsapp", m); }} status={getFieldStatus('whatsapp')} />
          <div className="flex-[41] min-w-0"><Textarea label="Do PS" value={pf.do_ps || ""} onChange={(v)=>{ setPf({...pf, do_ps:v}); queueSave("pf","do_ps", v); }} red compact status={getFieldStatus('do_ps')} /></div>
        </div>
        {/* Linha 3: Natural | UF | E-mail */}
        <div className="mt-4 flex gap-x-[5px]">
          <Field label="Natural" className="flex-[13] min-w-0" value={pf.naturalidade || ""} onChange={(v)=>{ setPf({...pf, naturalidade:v}); queueSave("pf","naturalidade", v); }} status={getFieldStatus('naturalidade')} />
          <Field label="UF" className="flex-[4] min-w-0" value={pf.uf_naturalidade || ""} onChange={(v)=>{ setPf({...pf, uf_naturalidade:v}); queueSave("pf","uf_naturalidade", v); }} status={getFieldStatus('uf_naturalidade')} />
          <Field label="E-mail" className="flex-[34] min-w-0" blue value={app.email || ""} onChange={(v)=>{ setApp({...app, email:v}); queueSave("app","email", v); }} status={getFieldStatus('email')} />
        </div>
      {/* Linha 3: Endereço | Nº | Complemento */}
        <div className="mt-4 flex gap-x-[5px]">
          <Field label="End" className="flex-[40] min-w-0" value={app.address_line || ""} onChange={(v)=>{ setApp({...app, address_line:v}); queueSave("app","address_line", v); }} status={getFieldStatus('address_line')} />
          <Field label="Nº" className="flex-[6] min-w-0" value={app.address_number || ""} onChange={(v)=>{ setApp({...app, address_number:v}); queueSave("app","address_number", v); }} status={getFieldStatus('address_number')} />
          <Field label="Compl" className="flex-[25] min-w-0" value={app.address_complement || ""} onChange={(v)=>{ setApp({...app, address_complement:v}); queueSave("app","address_complement", v); }} status={getFieldStatus('address_complement')} />
        </div>

      {/* Linha 5: CEP | Bairro | Cond | Tempo (4 cols) */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <Field label="CEP" value={app.cep || ""} onChange={(v)=>{
            const m = formatCep(v);
            setApp({...app, cep:m});
            queueSave('app','cep', m);
          }} status={getFieldStatus('cep')} />
          <div className="field-inline">
            <label className="text-[9px] font-bold uppercase tracking-wide leading-none shrink-0">Bairro</label>
            <div className="select-wrap">
              <SimpleSelect
                value={app.bairro || ""}
                onChange={(v)=>{ setApp({...app, bairro:v}); queueSave("app","bairro", v); }}
                options={routes.map(r => ({ label: r.name, value: r.name }))}
                placeholder="— selecione —"
                className="mt-0"
                triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
                contentStyle={{ zIndex: 9999 }}
              />
            </div>
          </div>
          <Field label="Cond" value={pf.cond || ""} onChange={(v)=>{ setPf({...pf, cond:v}); queueSave("pf","cond", v); }} status={getFieldStatus('cond')} />
          <Field label="Tempo" value={pf.tempo_endereco || ""} onChange={(v)=>{ setPf({...pf, tempo_endereco:v}); queueSave("pf","tempo_endereco", v); }} status={getFieldStatus('tempo_endereco')} />
        </div>

      {/* Linha 6: Do PS (endereço) — full row red */}
        <div className="mt-4">
          <Textarea
            label="Do PS"
            value={pf.endereco_do_ps || ""}
            onChange={(v)=>{ setPf({...pf, endereco_do_ps:v}); queueSave("pf","endereco_do_ps", v); }}
            red
            compact
            status={getFieldStatus('endereco_do_ps')}
          />
        </div>
        {/* Checklist removido: agora marcamos no label dos campos obrigatórios */}

      {/* Seção 3: Relações de Residência */}
        <div className="space-y-[4px]">
          {/* Linha 6: Moradia | Obs — Instalação oculta (manter lógica) */}
          <div className="flex gap-x-[5px]">
            <div className="flex-[13] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Moradia</label>
              <div className="select-wrap">
                <SimpleSelect
                  value={pf.tipo_moradia || ""}
                  onChange={(v)=>{ const patch: any = { tipo_moradia: v }; if (v !== 'Alugada') { patch.nome_locador = ''; patch.telefone_locador = ''; queueSave('pf','nome_locador',''); queueSave('pf','telefone_locador',''); } setPf(prev=>({...prev,...patch})); queueSave("pf","tipo_moradia", v); }}
                  options={["Própria","Alugada","Cedida","Outros"]}
                  className="mt-0"
                  triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            {/* Instalação — oculto temporariamente
            <div className="flex-[12] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Instalação</label>
              <div className="select-wrap">
                <SimpleSelect value={tipoInstalacao} onChange={(v) => { setTipoInstalacao(v); if (cardIdEff) { const dbVal = uiToTipoInst(v); supabase.from('kanban_cards').update({ tipo_instalacao: dbVal }).eq('id', cardIdEff).then(() => {}); } }} options={[...TIPO_INST_UI]} className="mt-0" triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600" contentClassName="rounded-lg shadow-lg border-0" />
              </div>
            </div>
            */}
            <Field label="Obs" className="flex-[44] min-w-0" value={pf.tipo_moradia_obs || ""} onChange={(v)=>{ setPf({...pf, tipo_moradia_obs:v}); queueSave("pf","tipo_moradia_obs", v); }} status={getFieldStatus('tipo_moradia_obs')} />
          </div>
          {/* Linha 7: Única no lote | Obs */}
          <div className="flex gap-x-[5px]">
            <div className="flex-[16] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Única no lote</label>
              <div className="select-wrap">
                <SimpleSelect
                  value={pf.unica_no_lote || ""}
                  onChange={(v)=>{ setPf(prev=>({ ...prev, unica_no_lote: v })); queueSave("pf","unica_no_lote", v); }}
                  options={["Sim","Não"]}
                  className="mt-0"
                  triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            <Field label="Obs" className="flex-[49] min-w-0" value={pf.unica_no_lote_obs || ""} onChange={(v)=>{ setPf({...pf, unica_no_lote_obs:v}); queueSave("pf","unica_no_lote_obs", v); }} status={getFieldStatus('unica_no_lote_obs')} />
          </div>
          {/* Linha 8: Reside com | Nas outras */}
          <div className="flex gap-x-[5px]">
            <Field label="Reside com" className="flex-[2] min-w-0" value={pf.com_quem_reside || ""} onChange={(v)=>{ setPf({...pf, com_quem_reside:v}); queueSave("pf","com_quem_reside", v); }} status={getFieldStatus('com_quem_reside')} />
            <div className="flex-[1] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Nas outras</label>
              <div className="select-wrap">
                <SimpleSelect
                  value={pf.nas_outras || ""}
                  onChange={(v)=>{ setPf({...pf, nas_outras:v}); queueSave("pf","nas_outras", v); }}
                  options={["XXXXX","Parentes","Locador(a)","Só conhecidos","Não conhece"]}
                  className="mt-0"
                  triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
          </div>
          {/* Linha 9: Tem contrato | Enviou | Nome de */}
          <div className="flex gap-x-[5px]">
            <div className="flex-[13] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Tem Contrato</label>
              <div className="select-wrap">
                <SimpleSelect
                  value={pf.tem_contrato || ""}
                  onChange={(v)=>{ setPf({...pf, tem_contrato:v}); queueSave("pf","tem_contrato", v); if (v === 'Não') { setPf(prev=>({ ...prev, enviou_contrato:'', nome_de:'' })); queueSave('pf','enviou_contrato',''); queueSave('pf','nome_de',''); } else if (v === 'Sim' && (pf.enviou_contrato||'') === 'Sim') { const nomeDe = (pf.nome_de || ''); setPf(prev=>({ ...prev, enviou_comprovante:'Sim', tipo_comprovante:'Outro', nome_comprovante: nomeDe })); queueSave('pf','enviou_comprovante','Sim'); queueSave('pf','tipo_comprovante','Outro'); queueSave('pf','nome_comprovante', nomeDe); } }}
                  options={["Sim","Não"]}
                  className="mt-0"
                  triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            <div className="flex-[9] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">
                Enviou
              </label>
              <div className="select-wrap">
                <SimpleSelect
                  value={pf.enviou_contrato || ""}
                  onChange={(v)=>{ setPf({...pf, enviou_contrato:v}); queueSave("pf","enviou_contrato", v); if (v !== 'Sim') { setPf(prev=>({ ...prev, nome_de:'' })); queueSave('pf','nome_de',''); } else if ((pf.tem_contrato||'') === 'Sim') { const nomeDe = (pf.nome_de || ''); setPf(prev=>({ ...prev, enviou_comprovante:'Sim', tipo_comprovante:'Outro', nome_comprovante: nomeDe })); queueSave('pf','enviou_comprovante','Sim'); queueSave('pf','tipo_comprovante','Outro'); queueSave('pf','nome_comprovante', nomeDe); } }}
                  options={["Sim","Não"]}
                  placeholder={reqEnviouContrato && !pf.enviou_contrato ? "Obrigatório" : undefined}
                  className="mt-0"
                  triggerClassName={`h-10 rounded-[7px] px-3 text-sm border shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600 ${!reqEnviouContrato ? 'opacity-50 pointer-events-none cursor-not-allowed bg-gray-100 text-gray-400 border-zinc-200' : errs.enviou_contrato ? 'border-red-400 bg-red-50' : 'border-emerald-500 bg-emerald-50'}`}
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            <Field label="Nome De" className="flex-[31] min-w-0" value={pf.nome_de || ""} onChange={(v)=>{ setPf({...pf, nome_de:v}); queueSave("pf","nome_de", v); if ((pf.tem_contrato||'') === 'Sim' && (pf.enviou_contrato||'') === 'Sim') { setPf(prev=>({ ...prev, nome_comprovante: v })); queueSave('pf','nome_comprovante', v); } }} error={errs.nome_de} requiredMark={reqNomeDe} disabled={!reqNomeDe} status={getFieldStatus('nome_de')} />
          </div>
          {/* Linha 10: Comprovante | Tipo | Nome */}
          <div className="flex gap-x-[5px]">
            <div className="flex-[18] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Comprovante</label>
              <div className="select-wrap">
                <SimpleSelect
                  value={pf.enviou_comprovante || ""}
                  onChange={(v)=>{ setPf({...pf, enviou_comprovante:v}); queueSave("pf","enviou_comprovante", v); }}
                  options={["Sim","Não"]}
                  className="mt-0"
                  triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            <div className="flex-[16] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Tipo</label>
              <div className="select-wrap">
                <SimpleSelect
                  value={pf.tipo_comprovante || ""}
                  onChange={(v)=>{ setPf({...pf, tipo_comprovante:v}); queueSave("pf","tipo_comprovante", v); }}
                  options={["Energia","Agua","Internet","Outro"]}
                  className="mt-0"
                  triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            <Field label="Nome" className="flex-[39] min-w-0" value={pf.nome_comprovante || ""} onChange={(v)=>{ setPf({...pf, nome_comprovante:v}); queueSave("pf","nome_comprovante", v); }} status={getFieldStatus('nome_comprovante')} />
          </div>
          {/* Linha 11: Locador | Tel Locador | Obs */}
          <div className="flex gap-x-[5px]">
            <Field label="Locador" className="flex-[22] min-w-0" value={pf.nome_locador || ""} onChange={(v)=>{ setPf({...pf, nome_locador:v}); queueSave("pf","nome_locador", v); }} error={errs.nome_locador} requiredMark={reqLocador} disabled={!reqLocador} status={getFieldStatus('nome_locador')} />
            <Field label="Tel" className="flex-[14] min-w-0" value={pf.telefone_locador || ""} onChange={(v)=>{ const m = maskPhoneLoose(v); setPf({...pf, telefone_locador:m}); queueSave("pf","telefone_locador", m); }} error={errs.telefone_locador} requiredMark={reqLocador} disabled={!reqLocador} status={getFieldStatus('telefone_locador')} />
            <Field label="Obs" className="flex-[20] min-w-0" value={pf.locador_obs || ""} onChange={(v)=>{ setPf({...pf, locador_obs:v}); queueSave("pf","locador_obs", v); }} status={getFieldStatus('locador_obs')} />
          </div>
          {/* Linha 12: Internet Fixa | Empresa | Obs */}
          <div className="flex gap-x-[5px] items-start">
            <div className="flex-[14] min-w-0 field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Internet fixa</label>
              <div className="select-wrap">
                <SimpleSelect
                  value={pf.tem_internet_fixa || ""}
                  onChange={(v)=>{ setPf({...pf, tem_internet_fixa:v}); queueSave("pf","tem_internet_fixa", v); }}
                  options={["Sim","Não"]}
                  className="mt-0"
                  triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            <Field label="Empresa" className="flex-[19] min-w-0" value={pf.empresa_internet || ""} onChange={(v)=>{ setPf({...pf, empresa_internet:v}); queueSave("pf","empresa_internet", v); }} status={getFieldStatus('empresa_internet')} />
            <div className="flex-[21] min-w-0"><Textarea label="Obs" value={pf.observacoes || ""} onChange={(v)=>{ setPf({...pf, observacoes:v}); queueSave("pf","observacoes", v); }} compact status={getFieldStatus('observacoes')} /></div>
          </div>
        </div>
        {/* Checklist removido: agora marcamos no label dos campos obrigatórios */}

      {/* Seções complementares resumidas (Emprego/Renda, Cônjuge, Filiação, Referências, Outras Inf, MK, Parecer) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Profissão" value={pf.profissao || ""} onChange={(v)=>{ setPf({...pf, profissao:v}); queueSave("pf","profissao", v); }} status={getFieldStatus('profissao')} />
          <Field label="Empresa" value={pf.empresa || ""} onChange={(v)=>{ setPf({...pf, empresa:v}); queueSave("pf","empresa", v); }} status={getFieldStatus('empresa')} />
          <div className="field-inline">
            <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Vínculo</label>
            <div className="select-wrap">
              <SimpleSelect
                value={pf.vinculo || ""}
                onChange={(v)=>{ setPf(prev=>({ ...prev, vinculo: v })); queueSave("pf","vinculo", v); }}
                options={["Carteira Assinada","Presta Serviços","Contrato de Trabalho","Autonômo","Concursado","Outro"]}
                className="mt-0"
                triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
          </div>
          </div>
          <Textarea
            label="Do PS"
            value={pf.emprego_do_ps || ""}
            onChange={(v)=>{ setPf({...pf, emprego_do_ps:v}); queueSave("pf","emprego_do_ps", v); }}
            red
            compact
            className="lg:col-span-4"
            status={getFieldStatus('emprego_do_ps')}
          />
        </div>

      {/* Cônjuge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Linha 1 */}
          <div className="field-inline">
            <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Estado Civil</label>
            <div className="select-wrap">
              <SimpleSelect
                value={pf.estado_civil || ""}
                onChange={(v)=>{ setPf({...pf, estado_civil:v}); queueSave("pf","estado_civil", v); }}
                options={["Solteiro(a)","Casado(a)","Amasiado(a)","Separado(a)","Viuvo(a)"]}
                className="mt-0"
                triggerClassName="h-10 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600"
                contentClassName="rounded-lg shadow-lg border-0"
              />
            </div>
          </div>
          <Field label="Obs" value={pf.conjuge_obs || ""} onChange={(v)=>{ setPf({...pf, conjuge_obs:v}); queueSave("pf","conjuge_obs", v); }} className="lg:col-span-3" status={getFieldStatus('conjuge_obs')} />
          {/* Linha 2 */}
          <Field label="Nome" value={pf.conjuge_nome || ""} onChange={(v)=>{ setPf({...pf, conjuge_nome:v}); queueSave("pf","conjuge_nome", v); }} className="lg:col-span-2" status={getFieldStatus('conjuge_nome')} />
          <Field label="Tel" value={pf.conjuge_telefone || ""} onChange={(v)=>{ setPf({...pf, conjuge_telefone:v}); queueSave("pf","conjuge_telefone", v); }} status={getFieldStatus('conjuge_telefone')} />
          <Field label="Whats" value={pf.conjuge_whatsapp || ""} onChange={(v)=>{ setPf({...pf, conjuge_whatsapp:v}); queueSave("pf","conjuge_whatsapp", v); }} status={getFieldStatus('conjuge_whatsapp')} />
          {/* Linha 3 */}
          <Field label="CPF" value={pf.conjuge_cpf || ""} onChange={(v)=>{ setPf({...pf, conjuge_cpf:v}); queueSave("pf","conjuge_cpf", v); }} status={getFieldStatus('conjuge_cpf')} />
          <Field label="Natural" value={pf.conjuge_naturalidade || ""} onChange={(v)=>{ setPf({...pf, conjuge_naturalidade:v}); queueSave("pf","conjuge_naturalidade", v); }} status={getFieldStatus('conjuge_naturalidade')} />
          <Field label="UF" value={pf.conjuge_uf || ""} onChange={(v)=>{ setPf({...pf, conjuge_uf:v}); queueSave("pf","conjuge_uf", v); }} status={getFieldStatus('conjuge_uf')} />
          <Field label="ID" value={pf.conjuge_idade || ""} onChange={(v)=>{ setPf({...pf, conjuge_idade:v}); queueSave("pf","conjuge_idade", v); }} maxLength={2} status={getFieldStatus('conjuge_idade')} />
          {/* Linha 4 */}
          <Textarea
            label="Do PS"
            value={pf.conjuge_do_ps || ""}
            onChange={(v)=>{ setPf({...pf, conjuge_do_ps:v}); queueSave("pf","conjuge_do_ps", v); }}
            red
            compact
            className="lg:col-span-4"
            status={getFieldStatus('conjuge_do_ps')}
          />
        </div>

      {/* Informações SPC / Pesquisador */}
        <div className="grid grid-cols-1 gap-4">
          <Textarea label="Informações SPC" value={app.info_spc || ""} onChange={(v)=>{ setApp({...app, info_spc:v}); queueSave("app","info_spc", v); }} red stack shrinkMin={2.5} />
          <Textarea label="Informações do Pesquisador" value={app.info_pesquisador || ""} onChange={(v)=>{ setApp({...app, info_pesquisador:v}); queueSave("app","info_pesquisador", v); }} red stack shrinkMin={2.5} />
        </div>
      {/* Filiação */}
        <p className="text-[14px] font-bold uppercase tracking-wide text-zinc-700 bg-yellow-200 px-1 py-0.5 rounded w-fit">FILIAÇÃO DO SOLICITANTE (SÓ PERGUNTAR SE SOLICITANTE TIVER MENOS DE 45ANOS)</p>
        <div className="space-y-[4px]">
          <div className="flex gap-x-[5px]">
            <Field label="Pai" className="flex-[34] min-w-0" value={pf.pai_nome || ""} onChange={(v)=>{ setPf({...pf, pai_nome:v}); queueSave("pf","pai_nome", v); }} status={getFieldStatus('pai_nome')} />
            <Field label="Reside" className="flex-[13] min-w-0" value={pf.pai_reside || ""} onChange={(v)=>{ setPf({...pf, pai_reside:v}); queueSave("pf","pai_reside", v); }} status={getFieldStatus('pai_reside')} />
            <Field label="Tel" className="flex-[12] min-w-0" value={pf.pai_telefone || ""} onChange={(v)=>{ setPf({...pf, pai_telefone:v}); queueSave("pf","pai_telefone", v); }} status={getFieldStatus('pai_telefone')} />
          </div>
          <div className="flex gap-x-[5px]">
            <Field label="Mãe" className="flex-[34] min-w-0" value={pf.mae_nome || ""} onChange={(v)=>{ setPf({...pf, mae_nome:v}); queueSave("pf","mae_nome", v); }} status={getFieldStatus('mae_nome')} />
            <Field label="Reside" className="flex-[13] min-w-0" value={pf.mae_reside || ""} onChange={(v)=>{ setPf({...pf, mae_reside:v}); queueSave("pf","mae_reside", v); }} status={getFieldStatus('mae_reside')} />
            <Field label="Tel" className="flex-[12] min-w-0" value={pf.mae_telefone || ""} onChange={(v)=>{ setPf({...pf, mae_telefone:v}); queueSave("pf","mae_telefone", v); }} status={getFieldStatus('mae_telefone')} />
          </div>
        </div>
      {/* Referências Pessoais */}
        <p className="text-[14px] font-bold uppercase tracking-wide text-zinc-700 bg-yellow-200 px-1 py-0.5 rounded w-fit">REFERÊNCIAS PESSOAIS (DE PREFERÊNCIAS PARENTES EM 1º GRAU)</p>
        <div className="space-y-[4px]">
          <div className="flex gap-x-[5px]">
            <Field label="" className="flex-[37] min-w-0" value={pf.ref1_nome || ""} onChange={(v)=>{ setPf({...pf, ref1_nome:v}); queueSave("pf","ref1_nome", v); }} status={getFieldStatus('ref1_nome')} />
            <Field label="" className="flex-[11] min-w-0" value={pf.ref1_parentesco || ""} onChange={(v)=>{ setPf({...pf, ref1_parentesco:v}); queueSave("pf","ref1_parentesco", v); }} status={getFieldStatus('ref1_parentesco')} />
            <Field label="Tel" className="flex-[9] min-w-0" value={pf.ref1_telefone || ""} onChange={(v)=>{ setPf({...pf, ref1_telefone:v}); queueSave("pf","ref1_telefone", v); }} status={getFieldStatus('ref1_telefone')} />
            <Field label="Reside" className="flex-[9] min-w-0" value={pf.ref1_reside || ""} onChange={(v)=>{ setPf({...pf, ref1_reside:v}); queueSave("pf","ref1_reside", v); }} status={getFieldStatus('ref1_reside')} />
          </div>
          <div className="flex gap-x-[5px]">
            <Field label="" className="flex-[37] min-w-0" value={pf.ref2_nome || ""} onChange={(v)=>{ setPf({...pf, ref2_nome:v}); queueSave("pf","ref2_nome", v); }} status={getFieldStatus('ref2_nome')} />
            <Field label="" className="flex-[11] min-w-0" value={pf.ref2_parentesco || ""} onChange={(v)=>{ setPf({...pf, ref2_parentesco:v}); queueSave("pf","ref2_parentesco", v); }} status={getFieldStatus('ref2_parentesco')} />
            <Field label="Tel" className="flex-[9] min-w-0" value={pf.ref2_telefone || ""} onChange={(v)=>{ setPf({...pf, ref2_telefone:v}); queueSave("pf","ref2_telefone", v); }} status={getFieldStatus('ref2_telefone')} />
            <Field label="Reside" className="flex-[9] min-w-0" value={pf.ref2_reside || ""} onChange={(v)=>{ setPf({...pf, ref2_reside:v}); queueSave("pf","ref2_reside", v); }} status={getFieldStatus('ref2_reside')} />
          </div>
        </div>
      {/* Outras Informações / MK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="pf-highlight-row sm:col-span-2 lg:col-span-4 grid grid-cols-1 gap-2">
            {/* Linha 1: Plano escolhido | Venc */}
            <div className="flex items-center gap-2">
              <label className="pf-highlight-field shrink-0 text-[9px] font-bold uppercase tracking-wide leading-none no-colon">Plano escolhido</label>
              <div className="flex-1 min-w-0">
                <SimpleSelect
                  value={app.plano_acesso || ""}
                  onChange={(v)=>{ setApp({...app, plano_acesso:v}); queueSave("app","plano_acesso", v); }}
                  options={PLANO_OPTIONS as any}
                  className="mt-0"
                  triggerClassName="h-[21px] w-full rounded-[2px] border border-zinc-400 bg-blue-100 px-1 text-[10px] text-zinc-900"
                  contentClassName="rounded-lg shadow-lg border-0"
                  contentStyle={{ zIndex: 9999 }}
                />
              </div>
              <label className="pf-highlight-field shrink-0 text-[9px] font-bold uppercase tracking-wide leading-none no-colon">Venc</label>
              <div className="w-14 shrink-0">
                <SimpleSelect
                  value={app.venc || ""}
                  onChange={(v)=>{ setApp({...app, venc:v}); queueSave("app","venc", v); }}
                  options={["5","10","15","20","25"]}
                  className="mt-0"
                  triggerClassName="h-[21px] w-full rounded-[2px] border border-zinc-400 bg-blue-100 px-1 text-[10px] text-zinc-900"
                  contentClassName="rounded-lg shadow-lg border-0"
                  contentStyle={{ zIndex: 9999 }}
                />
              </div>
            </div>
            {/* Linha 2: Sva Avulso */}
            <div className="field-inline">
              <label className="pf-highlight-field mb-0.5 block text-[9px] font-bold uppercase tracking-wide leading-none">SVA Avulso</label>
              <SimpleSelect
                value={app.sva_avulso || ""}
                onChange={(v)=>{ setApp({...app, sva_avulso:v}); queueSave("app","sva_avulso", v); }}
                options={SVA_OPTIONS as any}
                className="mt-0"
                triggerClassName="h-[21px] w-full rounded-[2px] border border-zinc-400 bg-blue-100 px-1 text-[10px] text-zinc-900"
                contentClassName="rounded-lg shadow-lg border-0"
                contentStyle={{ zIndex: 9999 }}
              />
            </div>
          </div>

          {/* Linha 1: Solicitante | Meio | Fone */}
          <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-3 gap-2">
            <Field label="Solicitante" value={app.quem_solicitou || ""} onChange={(v)=>{ setApp({...app, quem_solicitou:v}); queueSave("app","quem_solicitou", v); }} status={getFieldStatus('quem_solicitou')} />
            <div className="field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Meio</label>
              <div className="flex-1 min-w-0">
                <SimpleSelect
                  value={app.meio || ""}
                  onChange={(v)=>{ setApp({...app, meio:v}); queueSave("app","meio", v); }}
                  options={["Ligação","Whatspp","Presensicial","Whats - Uber"]}
                  className="mt-0"
                  triggerClassName="h-[21px] w-full rounded-[2px] border border-zinc-400 bg-blue-100 px-1 text-[10px] text-zinc-900"
                  contentClassName="rounded-lg shadow-lg border-0"
                />
              </div>
            </div>
            <Field label="Fone" value={app.telefone_solicitante || ""} onChange={(v)=>{ setApp({...app, telefone_solicitante:v}); queueSave("app","telefone_solicitante", v); }} status={getFieldStatus('telefone_solicitante')} />
          </div>
          {/* Linha 2: Data | Protocolo MK | Representante Mz */}
          <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-3 gap-2">
            <Field label="Data" value={app.created_at ? (() => { const d = new Date(app.created_at!); const dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'), aa=String(d.getFullYear()).slice(-2), hh=String(d.getHours()).padStart(2,'0'), min=String(d.getMinutes()).padStart(2,'0'); return `${dd}/${mm}/${aa} ${hh}:${min}`; })()||"" : ""} onChange={()=>{}} disabled status="idle" />
            <Field label="Protocolo MK" value={app.protocolo_mk || ""} onChange={(v)=>{ setApp({...app, protocolo_mk:v}); queueSave("app","protocolo_mk", v); }} status={getFieldStatus('protocolo_mk')} />
            <Field label="Representante Mz" value={app.representante_mz || ""} onChange={()=>{}} disabled status="idle" />
          </div>
          {/* Linha 3: Agendada | Horário */}
          <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-2 gap-2">
            <div className="field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Agendada</label>
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
            <div className="field-inline">
              <label className="text-[9px] font-bold uppercase tracking-wide leading-none text-zinc-600 shrink-0">Horário</label>
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
          <Textarea label="Informações relevantes" value={app.info_relevantes || ""} onChange={(v)=>{ setApp({...app, info_relevantes:v}); queueSave("app","info_relevantes", v); }} className="lg:col-span-4" status={getFieldStatus('info_relevantes')} stack shrinkMin={2.5} />
          <Textarea label="Informações Relevantes do MK" value={app.info_mk || ""} onChange={(v)=>{ setApp({...app, info_mk:v}); queueSave("app","info_mk", v); }} red className="lg:col-span-4" status={getFieldStatus('info_mk')} stack shrinkMin={2.5} />
        </div>
      </Card>

      {(
        <Card title="Parecer" noBorder red>
          <div className="space-y-4">
            <div className="relative" ref={parecerContainerRef}>
              <UnifiedComposer
                ref={parecerComposerRef}
                className="composer-root--blue"
                placeholder="Escreva um novo parecer… Use @ para mencionar, / para comandos"
                ariaLabel="Escrever parecer"
                disabled={!canWriteParecer}
                richText
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
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachmentInputChange}
        accept={ATTACHMENT_ALLOWED_TYPES.join(",")}
      />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, noBorder, red }: { title?: string; children: React.ReactNode; noBorder?: boolean; red?: boolean }) {
  return (
    <div className="mb-3">
      {title && (
        <div className={noBorder ? "pb-[3px] mb-2" : "pf-card-header"}>
          <span
            className={red ? "font-bold uppercase tracking-[0.06em] underline" : "text-[9px] font-bold uppercase tracking-widest text-zinc-700"}
            style={red ? { fontSize: '12px', color: '#dc2626' } : undefined}
          >{title}</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function Grid({ cols, children }: { cols: 1|2|3|4; children: React.ReactNode }) {
  const cls = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-4";
  return <div className={`grid gap-1 ${cls}`}>{children}</div>;
}

function Field({ label, value, onChange, className, error, red, blue, requiredMark, disabled, maxLength, status, placeholder, inputMode }: { label: string; value: string; onChange: (v: string)=>void; className?: string; error?: boolean; red?: boolean; blue?: boolean; requiredMark?: boolean; disabled?: boolean; maxLength?: number; status?: 'idle'|'pending'|'error'; placeholder?: string; inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode'] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const MAX = 13; const MIN = 7; const STEP = 0.5;
    el.style.setProperty('--field-fs', `${MAX}px`);
    if (!value || el.clientWidth === 0) return;
    const available = el.clientWidth - 14; // 7px padding each side
    if (available <= 0) return;
    const canvas: HTMLCanvasElement = ((window as any).__mzMeasureCanvas ??= document.createElement('canvas'));
    const ctx = canvas.getContext('2d')!;
    const fontFamily = getComputedStyle(el).fontFamily || 'sans-serif';
    let size = MAX;
    while (size > MIN) {
      ctx.font = `400 ${size}px ${fontFamily}`;
      if (ctx.measureText(value).width <= available) break;
      size = Math.max(MIN, size - STEP);
    }
    el.style.setProperty('--field-fs', `${size}px`);
  }, [value]);
  return (
    <div className={className}>
      <div className="field-inline">
        <label className={`text-[9px] font-bold uppercase tracking-wide leading-none${red ? ' label-red' : blue ? ' label-blue' : ' text-zinc-600'}${!label ? ' no-colon' : ''}`}>
          {label}
        </label>
        <input
          ref={inputRef}
          value={value}
          onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
          onBlur={()=>{ try { window.dispatchEvent(new CustomEvent('mz-field-blur')); } catch {} }}
          disabled={disabled}
          maxLength={maxLength}
          inputMode={inputMode}
          className={`h-[21px] w-full rounded-[2px] border ${error || red ? 'border-red-400 bg-red-50' : requiredMark && !disabled ? 'border-emerald-500 bg-emerald-50 placeholder:text-emerald-600 placeholder:font-semibold' : 'border-zinc-400 bg-blue-100'} px-1 text-[10px] outline-none focus:border-zinc-600 ${disabled ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'text-zinc-900'}${red && !disabled ? ' input-red' : ''}`}
          placeholder={requiredMark && !disabled ? "Obrigatório" : (placeholder ?? "")}
          autoComplete="off"
        />
      </div>
      <FieldStatusIndicator status={status || 'idle'} />
    </div>
  );
}

function Textarea({ label, value, onChange, red, error, className, requiredMark, disabled, status, stack, compact, shrinkMin = 6 }: { label: string; value: string; onChange: (v: string)=>void; red?: boolean; error?: boolean; className?: string; requiredMark?: boolean; disabled?: boolean; status?: 'idle'|'pending'|'error'; stack?: boolean; compact?: boolean; shrinkMin?: number }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (compact) return;
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
  }, [value, compact, shrinkMin]);

  const requiredBadge = null;
  const compactLabelClass = `text-[9px] font-bold uppercase tracking-wide leading-none${red ? ' label-red' : ' text-zinc-600'}`;
  const regularLabelClass = `pf-section-title pt-1${red ? ' label-red' : ''}`;
  const ta = (
    <textarea
      ref={taRef}
      value={value}
      onChange={(e)=>{ if (disabled) return; onChange(e.target.value); }}
      onBlur={()=>{ try { window.dispatchEvent(new CustomEvent('mz-field-blur')); } catch {} }}
      disabled={disabled}
      rows={compact ? 1 : undefined}
      className={`${compact ? 'pf-textarea-compact overflow-hidden' : 'py-1'} w-full rounded-[2px] border ${error || red ? 'border-red-300 bg-red-50' : requiredMark && !disabled ? 'border-emerald-500 bg-emerald-50 placeholder:text-emerald-600 placeholder:font-semibold' : 'border-zinc-300 bg-blue-100'} px-1.5 text-[10px] outline-none ${red ? 'text-red-700' : 'text-zinc-900'} resize-none`}
      placeholder={requiredMark && !disabled ? "Obrigatório" : ""}
    />
  );
  return (
    <div className={className}>
      {stack ? (
        <>
          <div className="border-b border-zinc-500 mb-1 pb-0.5">
            <label className={regularLabelClass}>{label}{requiredBadge}</label>
          </div>
          {ta}
        </>
      ) : (
        <div className="field-inline">
          <label className={compact ? compactLabelClass : regularLabelClass}>{label}{requiredBadge}</label>
          {ta}
        </div>
      )}
      <FieldStatusIndicator status={status || 'idle'} />
    </div>
  );
}

type Opt = string | { label: string; value: string; disabled?: boolean };
function Select({ label, value, onChange, options, error, requiredMark, disabled }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[]; error?: boolean; requiredMark?: boolean; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-700">
        <span>{label}</span>
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
            onBlur={()=>{ try { window.dispatchEvent(new CustomEvent('mz-field-blur')); } catch {} }}
            disabled={disabled}
            className={`h-10 w-full rounded-[7px] border px-3 text-sm outline-none shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-zinc-200' : error ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-300 text-zinc-900' : requiredMark ? 'border-emerald-500 bg-emerald-50 text-zinc-900 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600' : 'border-zinc-200 bg-zinc-50 text-zinc-900 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600'}`}
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

function FieldStatusIndicator({ status }: { status: 'idle'|'pending'|'error' }) {
  if (status !== 'error') return null;
  return (
    <div className="mt-1 text-xs h-4 flex items-center gap-1">
      <span className="text-red-500">Erro ao salvar</span>
    </div>
  );
}

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
            <button
              key={i.key}
              onClick={() => onPick(i.key)}
              className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left"
              role="option"
              id={`cmd-opt-${i.key}`}
            >
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


// (Removido) Segmented control; categorias agora ficam dentro do dropdown

function ZoomPortal({ zoom, setZoom }: { zoom: number; setZoom: (fn: (z: number) => number) => void }) {
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
