"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent, useCallback, Fragment } from "react";
import Image from "next/image";
import clsx from "clsx";
import { User as UserIcon, MoreHorizontal, X, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { changeStage } from "@/features/kanban/services";
import Attach from "@/features/attachments/upload";
import { listAttachments, type CardAttachment } from "@/features/attachments/services";
import { DateSingleKanbanPopover } from "@/components/ui/date-single-kanban-popover";
import { TimeMultiSelect } from "@/components/ui/time-multi-select";
import { UnifiedComposer, type ComposerDecision, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import MentionDropdown from "@/components/mentions/MentionDropdown";
import { type ProfileLite } from "@/lib/profiles";
import { useSidebar } from "@/components/ui/sidebar";
import { DEFAULT_TIMEZONE, startOfDayUtcISO, utcISOToLocalParts, localDateTimeToUtcISO } from "@/lib/datetime";
import { renderTextWithChips } from "@/utils/richText";
import { useDebouncedCallback } from "@/utils/useDebouncedCallback";
import type { AppModel, CardSnapshotPatch } from "./types";
import { PLANO_OPTIONS, SVA_OPTIONS, VENC_OPTIONS } from "./constants";
import { Field, Select, SelectAdv } from "./components/Fields";
import { CmdDropdown } from "./components/CmdDropdown";
import { DecisionTag, decisionPlaceholder } from "./utils/decision";
import { PareceresList } from "./components/PareceresList";
import { FileUploadDropzone, PendingFileChip } from "@/components/ui/file-upload";
import { addParecer, editParecer, deleteParecer, setCardDecision, fetchApplicantCard } from "./services";
import { suggestAssignmentRPC } from "@/features/agenda/services";
import { listRoutes, type Route } from "@/features/builder/services";
import { useEditarFichaData } from "./hooks/useEditarFichaData";
import { useUserRole } from "@/hooks/useUserRole";
import { useIndexedDraft } from "@/hooks/useIndexedDraft";
import { saveDraft, getDraft, deleteDraft } from "@/lib/drafts";


export function EditarFichaModal({
  open,
  onClose,
  cardId,
  applicantId,
  onStageChange,
  onCardUpdate,
}: {
  open: boolean;
  onClose: () => void;
  cardId: string;
  applicantId: string;
  onStageChange?: () => void;
  onCardUpdate?: (patch: CardSnapshotPatch) => void;
}) {
  const { open: sidebarOpen } = useSidebar();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [app, setApp] = useState<AppModel>({});
  const [dueAt, setDueAt] = useState<string>("");
  const [horaAt, setHoraAt] = useState<string>("");
  const [horaArr, setHoraArr] = useState<string[]>([]);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);

  const emitCardUpdate = useCallback(
    (patch: Partial<Omit<CardSnapshotPatch, "id">>) => {
      if (!onCardUpdate || !cardId) return;
      onCardUpdate({
        id: cardId,
        ...patch,
      });
    },
    [cardId, onCardUpdate]
  );

  // Update sidebar width on changes
  useEffect(() => {
    // Bloqueia o scroll da página quando o modal está aberto
    if (open) {
      const prevBody = document.body.style.overflow;
      const prevHtml = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBody;
        document.documentElement.style.overflow = prevHtml;
      };
    }
  }, [open]);

  // Carregar bairros (rotas) do banco uma única vez
  useEffect(() => {
    (async () => {
      try {
        const r = await listRoutes();
        setRoutes(r.filter((x) => x.active));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Backdrop deve cobrir a viewport inteira no modal de ficha
  // Menções no Parecer: popover desativado (continua aceitando texto com @)
  const [createdBy, setCreatedBy] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const draftKey = `parecer:${cardId}:${currentUserId ?? 'self'}`;
  // Draft minimal shape: only what must persist across sessions for 1h
  const [parecerDraft, setParecerDraft, clearParecerDraft, draftLoaded] = useIndexedDraft<{ text: string; decision: ComposerDecision | null }>(
    draftKey,
    { text: "", decision: null }
  );
  // Live composer state (UI): mentions are ephemeral (not persisted)
  const [novoParecer, setNovoParecer] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [cmdOpenParecer, setCmdOpenParecer] = useState(false);
  const [cmdQueryParecer, setCmdQueryParecer] = useState("");
  const composerRef = useRef<UnifiedComposerHandle | null>(null);
  // Menções no Parecer (composer principal)
  const parecerComposerContainerRef = useRef<HTMLDivElement | null>(null);
  const [mentionOpenParecer, setMentionOpenParecer] = useState(false);
  const [mentionFilterParecer, setMentionFilterParecer] = useState("");
  const [mentionAnchorParecer, setMentionAnchorParecer] = useState<{ top: number; left: number; height?: number }>({ top: 0, left: 0, height: 0 });
  // KISS: notas otimistas simples (somente criação), limpas ao sincronizar com backend
  const [optimisticNotes, setOptimisticNotes] = useState<any[]>([]);
  const [personType, setPersonType] = useState<'PF'|'PJ'|null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentContextRef = useRef<{ source?: "parecer" } | null>(null);
  const parecerAttachInputRef = useRef<HTMLInputElement | null>(null);
  const [parecerPendingFiles, setParecerPendingFiles] = useState<File[]>([]);
  const [cardAttachments, setCardAttachments] = useState<CardAttachment[]>([]);
  const { role: currentUserRole, isLeitor } = useUserRole();
  const isVendor = (currentUserRole ?? "").toLowerCase() === "vendedor";
  const isInstalador = (currentUserRole ?? "").toLowerCase() === "instalador";
  const canWriteParecer = !isVendor && !isLeitor && !isInstalador;

  const pendingApp = useRef<Partial<AppModel>>({});
  const pendingCard = useRef<Record<string, any>>({});
  const dirtyAppFields = useRef<Set<keyof AppModel>>(new Set());
  const dirtyCardFields = useRef<Set<string>>(new Set());
  const fieldStatus = useRef<Record<string, "idle" | "pending" | "error">>({});
  const [, forceStatusRender] = useState(0);

  const applyAppSnapshot = useCallback((next: Partial<AppModel> | null | undefined) => {
    if (!next) return;
    setApp((prev) => {
      const merged = { ...prev };
      (Object.keys(next) as (keyof AppModel)[]).forEach((key) => {
        if (dirtyAppFields.current.has(key)) return;
        const value = next[key];
        if (typeof value === "undefined") return;
        (merged as any)[key] = value as any;
      });
      return merged;
    });
  }, []);

  const applyCardSnapshot = useCallback((payload: { dueAt?: string; horaAt?: string; horaArr?: string[] }) => {
    if (payload.dueAt !== undefined && !dirtyCardFields.current.has("due_at")) {
      setDueAt(payload.dueAt);
    }
    if (payload.horaArr !== undefined && !dirtyCardFields.current.has("hora_at")) {
      setHoraArr(payload.horaArr);
    }
    if (payload.horaAt !== undefined && !dirtyCardFields.current.has("hora_at")) {
      setHoraAt(payload.horaAt);
    }
  }, []);

  function triggerAttachmentPicker(context?: { source?: "parecer" }) {
    if (!canWriteParecer) return;
    attachmentContextRef.current = context ?? null;
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
      attachmentInputRef.current.click();
    }
  }

  async function processAttachmentSelection(files: File[]) {
    if (!cardId || files.length === 0) return;
    const context = attachmentContextRef.current;
    attachmentContextRef.current = null;

    const tooBig = files.find((file) => file.size > Attach.ATTACHMENT_MAX_SIZE);
    if (tooBig) {
      alert(`O arquivo "${tooBig.name}" excede o limite de ${(Attach.ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`);
      return;
    }

    const invalidType = files.find(
      (file) => file.type && !Attach.ATTACHMENT_ALLOWED_TYPES.includes(file.type)
    );
    if (invalidType) {
      alert(`O tipo de arquivo "${invalidType.type || invalidType.name}" não é permitido para anexos.`);
      return;
    }

    try {
      const uploaded = await Attach.uploadAttachmentBatch({
        cardId,
        files: files.map((file) => ({ file, displayName: file.name })),
      });

      if (context?.source === "parecer" && uploaded.length > 0) {
        const names = uploaded.map((f) => f.name).join(", ");
        try {
          const { error } = await addParecer({ cardId, text: `📎 Anexo(s): ${names}`, parentId: null, decision: null });
          if (error) {
            console.error("Falha ao registrar parecer para anexos", error);
            return;
          }
          await refreshCardSnapshot();
        } catch (err) {
          console.error("Falha ao registrar parecer para anexos", err);
        }
      }
    } catch (error: any) {
      console.error("Falha ao enviar anexos", error);
      alert(error?.message ?? "Falha ao anexar arquivos.");
    }
  }

  const refreshAttachments = useCallback(async () => {
    if (!cardId) return;
    try {
      const list = await listAttachments(cardId);
      setCardAttachments(list);
    } catch (e) {}
  }, [cardId]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        setCurrentUserId(uid);
      } catch (e) {}
    })();
  }, [open]);

  useEffect(() => {
    if (!open || canWriteParecer) return;
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [open, canWriteParecer]);

  // Hydrate composer DOM on open edge or key change (avoid fighting user typing)
  const prevOpenRef = useRef<boolean>(false);
  const prevDraftKeyRef = useRef<string | null>(null);
  const hydratedOnceRef = useRef<boolean>(false);
  useEffect(() => {
    const openEdge = open && !prevOpenRef.current;
    const keyChanged = draftKey !== prevDraftKeyRef.current;
    prevOpenRef.current = open;
    prevDraftKeyRef.current = draftKey;
    if (!open) return;
    // If opening or switching keys, hydrate when available from draft
    if ((openEdge || keyChanged) && draftLoaded) {
      hydratedOnceRef.current = true;
      const nextVal: ComposerValue = {
        decision: parecerDraft?.decision ?? null,
        text: parecerDraft?.text ?? "",
        mentions: [],
      };
      setNovoParecer(nextVal);
      try { requestAnimationFrame(() => composerRef.current?.setValue(nextVal)); } catch (e) {}
    }
  }, [open, draftLoaded, draftKey, parecerDraft]);

  // First successful draft load hydrate (if not hydrated by open/key change yet)
  useEffect(() => {
    if (!open) return;
    if (!draftLoaded) return;
    if (hydratedOnceRef.current) return;
    hydratedOnceRef.current = true;
    const nextVal: ComposerValue = {
      decision: parecerDraft?.decision ?? null,
      text: parecerDraft?.text ?? "",
      mentions: [],
    };
    setNovoParecer(nextVal);
    try { requestAnimationFrame(() => composerRef.current?.setValue(nextVal)); } catch (e) {}
  }, [open, draftLoaded, parecerDraft]);

  // Flush draft on unload (best-effort)
  useEffect(() => {
    if (!draftKey) return;
    const onBeforeUnload = () => {
      try { saveDraft(draftKey, { text: novoParecer.text ?? '', decision: novoParecer.decision ?? null }); } catch (e) {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [draftKey, novoParecer.text, novoParecer.decision]);

  // Flush draft when modal is closed (captures last keystrokes even under debounce)
  useEffect(() => {
    if (!draftKey) return;
    if (open === false) {
      try { saveDraft(draftKey, { text: novoParecer.text ?? '', decision: novoParecer.decision ?? null }); } catch (e) {}
    }
  }, [open, draftKey, novoParecer.text, novoParecer.decision]);

  // Migrate temporary 'self' key to user key once we have currentUserId
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!cardId) return;
    if (!currentUserId) return;
    if (migratedRef.current) return;
    const selfKey = `parecer:${cardId}:self`;
    const userKey = `parecer:${cardId}:${currentUserId}`;
    (async () => {
      try {
        const [selfDraft, userDraft] = await Promise.all([getDraft(selfKey), getDraft(userKey)]);
        const now = Date.now();
        const validSelf = selfDraft && now - (selfDraft as any).updated_at < 60*60*1000 ? (selfDraft as any) : null;
        const validUser = userDraft && now - (userDraft as any).updated_at < 60*60*1000 ? (userDraft as any) : null;
        if (validSelf) {
          const chosen = !validUser || (validSelf.updated_at > validUser.updated_at) ? validSelf : validUser;
          await saveDraft(userKey, chosen.value);
          await deleteDraft(selfKey);
        }
        migratedRef.current = true;
      } catch (e) {}
    })();
  }, [cardId, currentUserId]);

  useEffect(() => {
    if (canWriteParecer) return;
    setCmdOpenParecer(false);
    setCmdQueryParecer("");
  }, [canWriteParecer]);

  async function handleAttachmentInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (!canWriteParecer) return;
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await processAttachmentSelection(files);
  }

  async function syncDecisionStatus(decision: ComposerDecision | null) {
    if (!canWriteParecer) return;
    try {
      await setCardDecision(cardId, decision);
      // Fallback: se triggers foram removidas, mova o card explicitamente no Kanban de Análise
      try {
        if (decision === 'aprovado') await changeStage(cardId, 'analise', 'aprovados');
        else if (decision === 'negado') await changeStage(cardId, 'analise', 'negados');
        else if (decision === 'reanalise') await changeStage(cardId, 'analise', 'reanalise');
      } catch (e) {}
      // Atualiza o board
      try { onStageChange?.(); } catch (e) {}
    } catch (err) {
      console.error('set_card_decision failed', err);
    }
  }

  const data = useEditarFichaData({ open, applicantId, cardId });
  // Evita sobrescrever inputs enquanto o usuário digita: inicializa apenas uma vez por abertura
  const bootRef = useRef(false);
  const vendorName = data.vendorName;
  const analystName = data.analystName;
  const refreshCardSnapshot = data.refresh;
  // Limpa notas otimistas quando snapshot do backend mudar (evita duplicatas temporárias)
  useEffect(() => {
    if (optimisticNotes.length > 0) setOptimisticNotes([]);
  }, [data.pareceres]);

  // Carrega anexos ao abrir e ao mudar de card
  useEffect(() => {
    if (!open || !cardId) return;
    refreshAttachments();
  }, [open, cardId, refreshAttachments]);
  // Inicializa dados ao abrir com snapshot fresco do backend; evita resetar inputs enquanto o modal estiver aberto
  useEffect(() => {
    if (!open || bootRef.current) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const { applicant: a, card: c } = await fetchApplicantCard(applicantId, cardId);
        if (!active) return;
        const a2: any = { ...(a || {}) };
        if (typeof a2.venc !== 'undefined' && a2.venc !== null) a2.venc = String(a2.venc);
        applyAppSnapshot(a2 || {});
        setPersonType((a as any)?.person_type ?? null);
        setCreatedAt(c?.created_at ? new Date(c.created_at).toLocaleString() : "");
        const parts = utcISOToLocalParts(c?.due_at ?? undefined, DEFAULT_TIMEZONE);
        applyCardSnapshot({ dueAt: parts.dateISO ?? "" });
        if (Array.isArray((c as any)?.hora_at)) {
          const list = ((c as any).hora_at as any[]).map((h) => String(h).slice(0, 5));
          applyCardSnapshot({ horaArr: list, horaAt: list[0] || "" });
        } else {
          const v = c?.hora_at ? String(c.hora_at).slice(0, 5) : "";
          applyCardSnapshot({ horaAt: v, horaArr: v ? [v] : [] });
        }
        try { setTipoInstalacao(tipoInstCanToUI((c as any)?.tipo_instalacao ?? null)); } catch {}
        setCreatedBy((c as any)?.created_by || "");
        setAssigneeId((c as any)?.assignee_id || "");
        // Perf: perfis podem vir do hook; mantemos se já existir
        if (!profiles || profiles.length === 0) setProfiles(data.profiles || []);
      } finally {
        if (active) setLoading(false);
        bootRef.current = true;
      }
    })();
    return () => { active = false; };
  }, [open, applicantId, cardId, applyAppSnapshot, applyCardSnapshot]);

  // Mantém os perfis sincronizados com o hook (corrige lista vazia em @menções)
  useEffect(() => {
    setProfiles(data.profiles || []);
  }, [data.profiles]);

  // Ao fechar (ou trocar de ficha), permite nova inicialização na próxima abertura
  useEffect(() => {
    if (!open) bootRef.current = false;
  }, [open, applicantId, cardId]);

  // Listeners para abrir Anexo a partir dos inputs de Parecer (respostas)
  useEffect(() => {
    if (!canWriteParecer) return;
    function onOpenAttach(event?: Event) {
      const detail = (event as CustomEvent<{ source?: "parecer" }> | undefined)?.detail;
      triggerAttachmentPicker({
        source: detail?.source ?? "parecer",
      });
    }
    window.addEventListener('mz-open-attach', onOpenAttach);
    return () => {
      window.removeEventListener('mz-open-attach', onOpenAttach);
    };
  }, [canWriteParecer]);

  const flush = useCallback(async () => {
    if (!open || !canWriteParecer) {
      pendingApp.current = {};
      pendingCard.current = {};
      return;
    }
    const appPatch = pendingApp.current;
    const cardPatch = pendingCard.current;
    pendingApp.current = {};
    pendingCard.current = {};
    if (Object.keys(appPatch).length === 0 && Object.keys(cardPatch).length === 0) return;
    setSaving('saving');
    try {
      if (Object.keys(appPatch).length > 0) {
        const patch: any = { ...appPatch };
        if (typeof patch.venc !== 'undefined') {
          const n = parseInt(String(patch.venc), 10);
          patch.venc = Number.isFinite(n) ? n : null;
        }
        const { error } = await supabase.from('applicants').update(patch).eq('id', applicantId);
        if (error) throw error;
        (Object.keys(patch) as (keyof AppModel)[]).forEach((key) => {
          dirtyAppFields.current.delete(key);
          markFieldStatus(String(key), "idle");
        });
      }
      if (Object.keys(cardPatch).length > 0) {
        const cp: Record<string, any> = { ...cardPatch };
        const { error } = await supabase.from('kanban_cards').update(cp).eq('id', cardId);
        if (error) throw error;
        Object.keys(cp).forEach((key) => {
          dirtyCardFields.current.delete(key);
          markFieldStatus(key, "idle");
        });
      }
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 1000);
    } catch (err) {
      console.error(err);
      Object.keys(appPatch).forEach((key) => markFieldStatus(key, "error"));
      Object.keys(cardPatch).forEach((key) => markFieldStatus(key, "error"));
      setSaving('error');
    }
  }, [open, canWriteParecer, applicantId, cardId]);

  const scheduleFlush = useDebouncedCallback(flush, 1800);

  const queue = useCallback((scope:'app'|'card', key:string, value:any) => {
    if (!canWriteParecer) return;
    if (scope==='app') {
      pendingApp.current = { ...pendingApp.current, [key]: value };
    } else {
      pendingCard.current = { ...pendingCard.current, [key]: value };
    }
    scheduleFlush();
  }, [canWriteParecer, scheduleFlush]);

  const markFieldStatus = useCallback((key: string, status: "idle" | "pending" | "error") => {
    fieldStatus.current[key] = status;
    forceStatusRender((v) => v + 1);
  }, []);

  const getFieldStatus = useCallback((key: string) => fieldStatus.current[key] || "idle", []);

  const handleFieldBlur = useCallback(() => {
    flush();
  }, [flush]);

  const updateAppField = useCallback((key: keyof AppModel, value: any) => {
    setApp((prev) => ({ ...prev, [key]: value }));
    dirtyAppFields.current.add(key);
    markFieldStatus(String(key), "pending");
    queue('app', key, value);
  }, [queue, markFieldStatus]);

  const updateCardField = useCallback((key: 'due_at' | 'hora_at' | 'tipo_instalacao' | 'technician_id', value: any) => {
    dirtyCardFields.current.add(key);
    markFieldStatus(key, "pending");
    queue('card', key, value);
  }, [queue, markFieldStatus]);

  // (remoção) addParecer local substituído por services/addParecer e lógica inline

  const horarios = ["08:30","10:30","13:30","15:30"];
  // Tipo de Instalação (Agenda/Builder)
  const TIPO_INST_UI_DEFAULT = ['Casa','Prédio com Prumada','Prédio sem Prumada','Wi-Fi Extend'] as const;
  const TIPO_INST_UI_PJ = ['XXXX','Casa','Prédio com Prumada','Prédio sem Prumada','Wi-Fi Extend'] as const; // 'XXXX' = Nada
  function tipoInstCanToUI(v?: string | null) {
    const map: any = { casa:'Casa', predio_com_prumada:'Prédio com Prumada', predio_sem_prumada:'Prédio sem Prumada', 'wifi_extend':'Wi-Fi Extend' };
    return v ? (map[v] || '') : '';
  }
  function tipoInstUIToCan(v: string): string | null {
    if (v === 'XXXX') return null;
    const map: any = { 'Casa':'casa','Prédio com Prumada':'predio_com_prumada','Prédio sem Prumada':'predio_sem_prumada','Wi-Fi Extend':'wifi_extend' };
    return map[v] ?? null;
  }
  // Exibe somente estados úteis; não mostra mais "Salvo" para evitar animação/jitter visual
  const statusText = useMemo(() => (
    saving === 'saving' ? 'Salvando…' : saving === 'error' ? 'Erro ao salvar' : ''
  ), [saving]);
  const [tipoInstalacao, setTipoInstalacao] = useState<string>('');

  function openExpanded() {
    if (!applicantId) return;
    const isPJ = personType === 'PJ';
    const url = isPJ ? `/cadastro/pj/${applicantId}?card=${cardId}&from=analisar&standalone=1` : `/cadastro/pf/${applicantId}?card=${cardId}&from=analisar&standalone=1`;
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) {}
  }

  // Helpers de máscara (sem restringir a entrada de texto)
  function digitsOnly(s: string) { return (s || '').replace(/\D+/g, ''); }
  function formatCpf(d: string) {
    d = digitsOnly(d).slice(0,11);
    const p1=d.slice(0,3), p2=d.slice(3,6), p3=d.slice(6,9), p4=d.slice(9,11);
    let out=p1; if (p2) out += '.'+p2; if (p3) out += '.'+p3; if (p4) out += '-'+p4; return out;
  }
  function formatCnpj(d: string) {
    d = digitsOnly(d).slice(0,14);
    const p1=d.slice(0,2), p2=d.slice(2,5), p3=d.slice(5,8), p4=d.slice(8,12), p5=d.slice(12,14);
    let out=p1; if (p2) out += '.'+p2; if (p3) out += '.'+p3; if (p4) out += '/'+p4; if (p5) out += '-'+p5; return out;
  }
  function formatCpfCnpj(input: string) {
    const d = digitsOnly(input);
    if (d.length <= 11) return formatCpf(d);
    return formatCnpj(d);
  }
  // Para telefone/whatsapp: aplica máscara se não houver letras; se tiver texto, mantém
  function maskPhoneLoose(input: string) {
    if (/[A-Za-z]/.test(input)) return input; // permitir texto livre
    const d = digitsOnly(input).slice(0,11);
    const len = d.length; const ddd = d.slice(0,2);
    if (len <= 2) return d;
    if (len <= 6) return `(${ddd}) ${d.slice(2)}`;
    if (len <= 10) return `(${ddd}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${ddd}) ${d.slice(2,7)}-${d.slice(7)}`;
  }

  if (!open) return null;
  
  return (
    <Fragment>
      {/* Backdrop: abaixo do Drawer/Sidebar (z-40) e acima do Kanban */}
      <div className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-sm" />
      {/* Conteúdo do modal: acima do Drawer/Sidebar (z-70) */}
      <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-hidden pt-8 pb-6 sm:pt-12 sm:pb-8">
      <div className="relative w-[96vw] sm:w-[95vw] max-w-[1280px] h-[90vh] bg-[var(--neutro)] shadow-2xl flex flex-col overflow-hidden" style={{ borderRadius: '28px' }} onClick={(e)=> e.stopPropagation()}>
        {/* Header completo ocupando toda a largura */}
        <div className="header-editar-ficha flex-shrink-0">
          <div className="header-content">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <Image
                  src="/brand/mznet.png"
                  alt="MZNET"
                  width={72}
                  height={24}
                  priority
                  style={{ height: 'auto' }}
                />
              </div>
              <div className="header-title min-w-0">
                <h2 className="truncate">Editar Ficha</h2>
                <p className="header-subtitle truncate">Consultar e atualizar dados essenciais da ficha</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-emerald-600/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full min-h-0">
            {/* Coluna Esquerda: campos + pareceres (scroll próprio) */}
            <div className="flex-1 basis-[62%] min-w-0 min-h-0 h-full overflow-y-scroll overflow-x-hidden overscroll-contain modal-scroll">
              <div className="p-6 pb-12 sm:pb-16">
                {statusText && (
                  <div className="mb-6 mt-3 text-sm font-medium" style={{ color: 'var(--verde-primario)' }}>{statusText}</div>
                )}

                {loading && (
                  <div className="text-sm text-zinc-600">Carregando…</div>
                )}
                <div className="space-y-6" style={{ display: loading ? 'none' : undefined }}>
                  {/* CTA Analisar acima do bloco de Informações Pessoais, com cor primária */}
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-xs text-zinc-600">Clique aqui para:</span>
                    <button type="button" onClick={openExpanded} className="btn-primary-mznet whitespace-nowrap">
                      Analisar
                    </button>
                  </div>
            {/* Grade unificada — estilo corporativo sem seções separadas */}
            <div className={`space-y-4 ${isLeitor ? "pointer-events-none opacity-80" : ""}`}>

              {/* Nome + CPF/CNPJ */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-[3fr_2fr]">
                <Field label={personType==='PJ' ? 'Razão Social' : 'Nome do Cliente'} value={app.primary_name||''} onChange={(v)=>{ updateAppField('primary_name', v); emitCardUpdate({ applicantName: v }); }} status={getFieldStatus('primary_name')} onBlur={handleFieldBlur} />
                {personType === 'PJ' ? (
                  <Field label="CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCnpj(v); updateAppField('cpf_cnpj', m); emitCardUpdate({ cpfCnpj: m }); }} inputMode="numeric" maxLength={18} status={getFieldStatus('cpf_cnpj')} onBlur={handleFieldBlur} />
                ) : (
                  <Field label="CPF" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCpf(v); updateAppField('cpf_cnpj', m); emitCardUpdate({ cpfCnpj: m }); }} inputMode="numeric" maxLength={14} status={getFieldStatus('cpf_cnpj')} onBlur={handleFieldBlur} />
                )}
              </div>

              {/* Telefone + Whatsapp + E-mail */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <Field label="Telefone" value={app.phone||''} onChange={(v)=>{ const m=maskPhoneLoose(v); updateAppField('phone', m); emitCardUpdate({ phone: m }); }} status={getFieldStatus('phone')} onBlur={handleFieldBlur} />
                <Field label="Whatsapp" value={app.whatsapp||''} onChange={(v)=>{ const m=maskPhoneLoose(v); updateAppField('whatsapp', m); emitCardUpdate({ whatsapp: m }); }} status={getFieldStatus('whatsapp')} onBlur={handleFieldBlur} />
                <Field label="E-mail" value={app.email||''} onChange={(v)=>{ updateAppField('email', v); }} status={getFieldStatus('email')} onBlur={handleFieldBlur} />
              </div>

              {/* Logradouro + Número + Tipo de Instalação */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-[5fr_2fr_2fr]">
                <Field label="Logradouro" value={app.address_line||''} onChange={(v)=>{ updateAppField('address_line', v); }} status={getFieldStatus('address_line')} onBlur={handleFieldBlur} />
                <Field label="Número" value={app.address_number||''} onChange={(v)=>{ updateAppField('address_number', v); }} status={getFieldStatus('address_number')} onBlur={handleFieldBlur} />
                <Select
                  label="Tipo de Instalação"
                  value={tipoInstalacao}
                  onChange={(v) => {
                    setTipoInstalacao(v);
                    const can = tipoInstUIToCan(v);
                    updateCardField('tipo_instalacao', can);
                  }}
                  options={((personType||'')==='PJ' ? [...TIPO_INST_UI_PJ] : [...TIPO_INST_UI_DEFAULT]) as any}
                  contentStyle={{ zIndex: 9999 }}
                />
              </div>

              {/* Complemento + Bairro + CEP */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <Field label="Complemento" value={app.address_complement||''} onChange={(v)=>{ updateAppField('address_complement', v); }} status={getFieldStatus('address_complement')} onBlur={handleFieldBlur} />
                <Select
                  label="Bairro"
                  value={app.bairro||''}
                  onChange={(v)=>{ updateAppField('bairro', v); emitCardUpdate({ bairro: v }); handleFieldBlur?.(); }}
                  options={routes.map(r => ({ label: r.name, value: r.name }))}
                  contentStyle={{ zIndex: 9999 }}
                />
                <Field label="CEP" value={app.cep||''} onChange={(v)=>{ updateAppField('cep', v); }} status={getFieldStatus('cep')} onBlur={handleFieldBlur} />
              </div>

              {/* Plano + Vencimento + SVA + Carnê */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
                <SelectAdv label="Plano de Internet" value={app.plano_acesso||''} onChange={(v)=>{ updateAppField('plano_acesso', v); }} options={PLANO_OPTIONS as any} contentStyle={{ zIndex: 9999 }} />
                <Select label="Dia de vencimento" value={String(app.venc||'')} onChange={(v)=>{ updateAppField('venc', v); }} options={VENC_OPTIONS as any} contentStyle={{ zIndex: 9999 }} />
                <SelectAdv label="SVA Avulso" value={app.sva_avulso||''} onChange={(v)=>{ updateAppField('sva_avulso', v); }} options={SVA_OPTIONS as any} contentStyle={{ zIndex: 9999 }} />
                <Select label="Carnê impresso" value={app.carne_impresso ? 'Sim':'Não'} onChange={(v)=>{ const val = (v==='Sim'); updateAppField('carne_impresso', val); }} options={["Sim","Não"]} contentStyle={{ zIndex: 9999 }} />
              </div>

              {/* Criado em + Agendamento + Horário */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <Field label="Feito em" value={createdAt} onChange={()=>{}} disabled />
                <DateSingleKanbanPopover
                  label="Instalação agendada para"
                  labelClassName="block mb-1.5 text-[14px] font-bold uppercase tracking-wide leading-none text-zinc-600"
                  triggerClassName="h-10 rounded-[2px] px-3 bg-blue-100 border-zinc-400 "
                  value={dueAt}
                  onChange={async (val) => {
                    setDueAt(val || "");
                    if (!val) {
                      updateCardField('due_at', null);
                      updateCardField('hora_at', null);
                      updateCardField('technician_id', null);
                      setHoraArr([]);
                      setHoraAt("");
                      emitCardUpdate({ dueAt: null, horaAt: null });
                      return;
                    }
                    // Persistir meio-dia local para estabilizar a data (evita shift por fuso)
                    const noonUtc = localDateTimeToUtcISO(val, '12:00', DEFAULT_TIMEZONE);
                    updateCardField('due_at', noonUtc ?? null);
                    emitCardUpdate({ dueAt: noonUtc ?? null });

                    // Matching automático: o Workflow decide o técnico e o horário
                    try {
                      const tipoInstalacao = (app as any).tipo_instalacao ?? null;
                      const { technician_id, time_slot } = await suggestAssignmentRPC(
                        applicantId,
                        val,           // YYYY-MM-DD
                        tipoInstalacao
                      );
                      if (technician_id) {
                        updateCardField('technician_id', technician_id);
                      }
                      if (time_slot) {
                        const slots = [time_slot];
                        setHoraArr(slots);
                        setHoraAt(time_slot);
                        updateCardField('hora_at', slots.map((s) => `${s}:00`));
                        emitCardUpdate({ horaAt: time_slot });
                      }
                    } catch (err) {
                      // Falha silenciosa: due_at já foi salvo; técnico/horário podem ser ajustados manualmente
                      console.warn('[EditarFichaModal] suggest_assignment falhou; técnico não atribuído automaticamente', err);
                    }
                  }}
                />
                <TimeMultiSelect
                  label="Horário"
                  labelClassName="block mb-1.5 text-[14px] font-bold uppercase tracking-wide leading-none text-zinc-600"
                  triggerClassName="h-10 rounded-[2px] px-3 bg-blue-100 border-zinc-400 "
                  times={horarios}
                  value={horaArr}
                  onApply={(vals) => {
                    setHoraArr(vals);
                    setHoraAt(vals[0] || "");
                    if (vals.length === 0) updateCardField('hora_at', null);
                    else updateCardField('hora_at', vals.map(v=> `${v}:00`));
                    const horaLabel = vals.length === 0 ? null : vals.map((v) => v.slice(0, 5)).join(vals.length > 1 ? ' e ' : '');
                    emitCardUpdate({ horaAt: horaLabel });
                  }}
                  allowedPairs={[['08:30','10:30'],['13:30','15:30']]}
                  date={dueAt}
                />
              </div>

              {/* Equipe Responsável */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Field label="Vendedor" value={vendorName} onChange={()=>{}} disabled />
                <Field label="Analistas" value={analystName} onChange={()=>{}} disabled />
              </div>

            </div>

            {/* Pareceres */}
            <div>
                <label className="block mb-1.5 text-[14px] font-bold uppercase tracking-wide leading-none text-zinc-600">Parecer</label>
                <FileUploadDropzone
                  onFiles={(dropped) => {
                    if (!canWriteParecer) return;
                    const tooBig = dropped.find((f) => f.size > Attach.ATTACHMENT_MAX_SIZE);
                    if (tooBig) { alert(`"${tooBig.name}" excede ${(Attach.ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`); return; }
                    const invalid = dropped.find((f) => f.type && !Attach.ATTACHMENT_ALLOWED_TYPES.includes(f.type));
                    if (invalid) { alert(`Tipo "${invalid.type || invalid.name}" não permitido.`); return; }
                    setParecerPendingFiles((prev) => [...prev, ...dropped]);
                  }}
                  disabled={!canWriteParecer}
                  accept={Object.fromEntries(Attach.ATTACHMENT_ALLOWED_TYPES.map((t) => [t, []]))}
                  className="mb-3"
                >
                <div className="relative" ref={parecerComposerContainerRef}>
                  <UnifiedComposer
                    ref={composerRef}
                    className="composer-root--blue"
                    disabled={!canWriteParecer}
                    placeholder="Escreva um novo parecer… Use @ para mencionar, / para comandos"
                    ariaLabel="Escrever parecer"
                    richText
                    hasPendingAttachments={parecerPendingFiles.length > 0}
                    onAcceptMention={(query) => {
                      if (!canWriteParecer) return false;
                      const list = (profiles || []).filter((p) => (p.full_name || '').toLowerCase().includes((query||'').toLowerCase()))
                      if (list.length === 1) {
                        composerRef.current?.insertMention({ id: list[0].id, label: list[0].full_name });
                        setMentionOpenParecer(false);
                        setMentionFilterParecer('');
                        return true;
                      }
                      return false;
                    }}
                    onAcceptCommand={(query) => {
                      if (!canWriteParecer) return false;
                      const items = ['aprovado','negado','reanalise','anexo'].filter(k => k.includes((query||'').toLowerCase()));
                      if (items.length === 1) {
                        setCmdOpenParecer(false); setCmdQueryParecer('');
                        if (items[0] === 'anexo') {
                          parecerAttachInputRef.current?.click();
                          const cleanText = novoParecer.text.replace(/\s*\/[\w]*$/, '').trimEnd();
                          const next = { ...novoParecer, text: cleanText };
                          setNovoParecer(next);
                          composerRef.current?.setValue(next);
                        } else {
                          composerRef.current?.setDecision(items[0] as any);
                        }
                        return true;
                      }
                      return false;
                    }}
                    onChange={(val)=> {
                      setNovoParecer(val);
                      // Persist only the minimal draft payload
                      setParecerDraft({ text: val.text ?? "", decision: val.decision ?? null });
                    }}
                    onMentionTrigger={!canWriteParecer ? undefined : (query, rect) => {
                      setMentionFilterParecer((query || '').trim());
                      if (rect && parecerComposerContainerRef.current) {
                        const host = parecerComposerContainerRef.current.getBoundingClientRect();
                        const top = (rect.bottom ?? (rect.top + (rect.height || 0))) - host.top;
                        const left = (rect.left ?? host.left) - host.left;
                        setMentionAnchorParecer({ top, left, height: rect.height });
                      }
                      setMentionOpenParecer(true);
                    }}
                    onMentionClose={() => setMentionOpenParecer(false)}
                    onSubmit={!canWriteParecer ? undefined : async (val)=> {
                      const txt = (val.text || '').trim();
                      const hasDecision = !!val.decision;
                      if (!hasDecision && !txt && parecerPendingFiles.length === 0) return;
                      const payloadText = hasDecision && !txt ? decisionPlaceholder(val.decision ?? null) : txt;
                      // OTIMISTA: cria thread nível 1 localmente até o backend confirmar
                      const me = profiles.find((p) => p.id === currentUserId);
                      const tempNote: any = {
                        id: `tmp-${Date.now()}`,
                        text: hasDecision && !txt ? '' : txt,
                        decision: val.decision ?? null,
                        author_id: currentUserId ?? null,
                        author_name: me?.full_name || '',
                        author_role: me?.role || '',
                        created_at: new Date().toISOString(),
                        parent_id: null,
                      };
                      setOptimisticNotes((prev) => ([...(prev || []), tempNote]));
                      const resetValue: ComposerValue = { decision: null, text: '', mentions: [] };
                      setNovoParecer(resetValue);
                      requestAnimationFrame(() => composerRef.current?.setValue(resetValue));
                      // Clear all potential keys on successful submit (optimistic)
                      clearParecerDraft().catch(() => {});
                      try { await deleteDraft(`parecer:${cardId}:self`); } catch (e) {}
                      setCmdOpenParecer(false);
                      // KISS: sem locks; exibimos otimista e aguardamos refresh
                      const filesToUpload = parecerPendingFiles.slice();
                      if (filesToUpload.length > 0) setParecerPendingFiles([]);
                      try {
                        const { data: noteData, error } = await addParecer({ cardId, text: payloadText, parentId: null, decision: val.decision ?? null });
                        if (error) {
                          // Reverter otimista
                          setOptimisticNotes((prev) => (prev || []).filter((n: any) => n.id !== tempNote.id));
                          setNovoParecer(val);
                          if (filesToUpload.length > 0) setParecerPendingFiles(filesToUpload);
                          requestAnimationFrame(() => composerRef.current?.setValue(val));
                          alert(error.message || 'Falha ao adicionar parecer');
                          return;
                        }
                        // Upload anexos do parecer vinculados ao note_id
                        if (filesToUpload.length > 0) {
                          const notes = ((noteData as any)?.reanalysis_notes || []) as any[];
                          const newNote = [...notes].reverse().find((n: any) => !n.parent_id && !n.deleted);
                          const noteId: string | null = newNote?.id ?? null;
                          if (noteId) {
                            try {
                              await Attach.uploadAttachmentBatch({
                                cardId,
                                noteId,
                                files: filesToUpload.map((f) => ({ file: f })),
                              });
                            } catch (uploadErr: any) {
                              console.error('Falha ao enviar anexos do parecer', uploadErr);
                            }
                          }
                        }
                        await refreshCardSnapshot();
                        await refreshAttachments();
                        if (val.decision === 'aprovado' || val.decision === 'negado') {
                          await syncDecisionStatus(val.decision);
                        } else if (val.decision === 'reanalise') {
                          await syncDecisionStatus('reanalise');
                        }
                      } catch (err: any) {
                        // Reverter otimista
                        setOptimisticNotes((prev) => (prev || []).filter((n: any) => n.id !== tempNote.id));
                        setNovoParecer(val);
                        if (filesToUpload.length > 0) setParecerPendingFiles(filesToUpload);
                        requestAnimationFrame(() => composerRef.current?.setValue(val));
                        alert(err?.message || 'Falha ao adicionar parecer');
                      }
                    }}
                    onCancel={()=> {
                      setCmdOpenParecer(false);
                    }}
                    onCommandTrigger={!canWriteParecer ? undefined : (query)=>{
                      setCmdQueryParecer(query.toLowerCase());
                      setCmdOpenParecer(true);
                    }}
                    onCommandClose={()=> {
                      setCmdOpenParecer(false);
                      setCmdQueryParecer("");
                    }}
                  />
                  {/* Menções no Parecer */}
                  {canWriteParecer && mentionOpenParecer && (
                    <div className="absolute z-50" style={{ left: Math.max(0, (mentionAnchorParecer?.left || 0)), top: Math.max(0, (mentionAnchorParecer?.top || 0)) }}>
                      <MentionDropdown
                        items={(profiles || []).filter((p) => p.id !== currentUserId && (p.full_name || '').toLowerCase().includes(mentionFilterParecer.toLowerCase()))}
                        onPick={(p) => {
                          composerRef.current?.insertMention({ id: p.id, label: p.full_name });
                          setMentionOpenParecer(false);
                          setMentionFilterParecer("");
                        }}
                      />
                    </div>
                  )}
                  {canWriteParecer && cmdOpenParecer && (
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
                            composerRef.current?.setDecision(key as any);
                            return;
                          }
                          if (key==='anexo') {
                            parecerAttachInputRef.current?.click();
                            const cleanText = novoParecer.text.replace(/\s*\/[\w]*$/, '').trimEnd();
                            const next = { ...novoParecer, text: cleanText };
                            setNovoParecer(next);
                            composerRef.current?.setValue(next);
                            return;
                          }
                        }}
                        initialQuery={cmdQueryParecer}
                      />
                    </div>
                  )}
                </div>
                {canWriteParecer && parecerPendingFiles.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {parecerPendingFiles.map((f, i) => (
                      <PendingFileChip
                        key={i}
                        file={f}
                        onRemove={() => setParecerPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                )}
                </FileUploadDropzone>
                <input
                  ref={parecerAttachInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept={Attach.ATTACHMENT_ALLOWED_TYPES.join(",")}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    const tooBig = files.find((f) => f.size > Attach.ATTACHMENT_MAX_SIZE);
                    if (tooBig) { alert(`"${tooBig.name}" excede ${(Attach.ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`); return; }
                    const invalid = files.find((f) => f.type && !Attach.ATTACHMENT_ALLOWED_TYPES.includes(f.type));
                    if (invalid) { alert(`Tipo "${invalid.type || invalid.name}" não permitido.`); return; }
                    setParecerPendingFiles((prev) => [...prev, ...files]);
                  }}
                />

                <PareceresList
                  cardId={cardId}
                  notes={[...((data.pareceres as any[]) || []), ...optimisticNotes] as any}
                  attachments={cardAttachments}
                  profiles={profiles}
                  applicantName={app?.primary_name ?? null}
                  currentUserId={currentUserId}
                  canWrite={canWriteParecer}
                  onReply={async (pid, value) => {
                    const text = (value.text || '').trim();
                    const hasDecision = !!value.decision;
                    const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
                    // OTIMISTA: mostra a resposta imediatamente (igual ao campo inicial de Parecer)
                    const me = profiles.find((p) => p.id === currentUserId);
                    const tempReply: any = {
                      id: `tmp-reply-${Date.now()}`,
                      text: hasDecision && !text ? '' : text,
                      decision: value.decision ?? null,
                      author_id: currentUserId ?? null,
                      author_name: me?.full_name || '',
                      author_role: me?.role || '',
                      created_at: new Date().toISOString(),
                      parent_id: pid,
                    };
                    setOptimisticNotes((prev) => [...(prev || []), tempReply]);
                    try {
                      const { data: noteData, error } = await addParecer({ cardId, text: payloadText, parentId: pid, decision: value.decision ?? null });
                      if (error) {
                        setOptimisticNotes((prev) => (prev || []).filter((n: any) => n.id !== tempReply.id));
                        alert(error.message || "Falha ao adicionar parecer");
                        return null;
                      }
                      const notes = ((noteData as any)?.reanalysis_notes || []) as any[];
                      const newNote = [...notes].reverse().find((n: any) => n.parent_id === pid && !n.deleted);
                      const noteId: string | null = newNote?.id ?? null;
                      await refreshCardSnapshot();
                      await refreshAttachments();
                      if (value.decision === 'aprovado' || value.decision === 'negado') {
                        await syncDecisionStatus(value.decision);
                      } else if (value.decision === 'reanalise') {
                        await syncDecisionStatus('reanalise');
                      }
                      return noteId;
                    } catch (err: any) {
                      setOptimisticNotes((prev) => (prev || []).filter((n: any) => n.id !== tempReply.id));
                      alert(err?.message || 'Falha ao adicionar resposta');
                      return null;
                    }
                  }}
                  onEdit={async (id, value) => {
                    const text = (value.text || '').trim();
                    const hasDecision = !!value.decision;
                    if (!hasDecision && !text) return;
                    const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
                    const { error } = await editParecer({ cardId, noteId: id, text: payloadText, decision: value.decision ?? null });
                    if (error) {
                      alert(error.message || "Falha ao editar parecer");
                      throw error; // Re-throw para o wrapper otimista reverter
                    }
                    // Atualizar em background (UI já está atualizada otimisticamente)
                    refreshCardSnapshot().catch(() => {}); // Não bloquear se falhar
                    if (value.decision === 'aprovado' || value.decision === 'negado') {
                      syncDecisionStatus(value.decision).catch(() => {}); // Não bloquear se falhar
                    } else if (value.decision === 'reanalise') {
                      syncDecisionStatus('reanalise').catch(() => {}); // Não bloquear se falhar
                    }
                  }}
                  onDelete={async (id) => {
                    const { error } = await deleteParecer({ cardId, noteId: id });
                    if (error) {
                      alert(error.message || "Falha ao excluir parecer");
                      throw error; // Re-throw para o wrapper otimista reverter
                    }
                    // Atualizar em background (UI já está atualizada otimisticamente)
                    refreshCardSnapshot().catch(() => {}); // Não bloquear se falhar
                  }}
                  onDecisionChange={syncDecisionStatus}
                  onAttachmentUploaded={refreshAttachments}
                />
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttachmentInputChange}
        accept={Attach.ATTACHMENT_ALLOWED_TYPES.join(",")}
      />
    </Fragment>
  );
}
// MentionDropdown now shared in @/components/mentions/MentionDropdown
