"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent, useCallback, Fragment } from "react";
import Image from "next/image";
import clsx from "clsx";
import { User as UserIcon, MoreHorizontal } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Conversation } from "@/features/comments/Conversation";
import { TaskDrawer } from "@/features/tasks/TaskDrawer";
import { TaskCard } from "@/features/tasks/TaskCard";
import { listTasks, toggleTask, type CardTask } from "@/features/tasks/services";
import { changeStage } from "@/features/kanban/services";
import Attach from "@/features/attachments/upload";
import { DateSingleKanbanPopover } from "@/components/ui/date-single-kanban-popover";
import { TimeMultiSelect } from "@/components/ui/time-multi-select";
import { UnifiedComposer, type ComposerDecision, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import { type ProfileLite } from "@/features/comments/services";
import { useSidebar } from "@/components/ui/sidebar";
import { DEFAULT_TIMEZONE, startOfDayUtcISO, utcISOToLocalParts, localDateTimeToUtcISO } from "@/lib/datetime";
import { renderTextWithChips } from "@/utils/richText";
import { useDebouncedCallback } from "@/utils/useDebouncedCallback";
import type { AppModel, CardSnapshotPatch } from "./types";
import { PLANO_OPTIONS, SVA_OPTIONS, VENC_OPTIONS } from "./constants";
import { Section, Grid } from "./components/Layout";
import { Field, Select, SelectAdv } from "./components/Fields";
import { CmdDropdown } from "./components/CmdDropdown";
import { DecisionTag, decisionPlaceholder } from "./utils/decision";
import { PareceresList } from "./components/PareceresList";
import { addParecer, editParecer, deleteParecer, setCardDecision, fetchApplicantCard } from "./services";
import { useEditarFichaData } from "./hooks/useEditarFichaData";
import { useUserRole } from "@/hooks/useUserRole";


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

  // Backdrop deve cobrir a viewport inteira no modal de ficha
  // Menções no Parecer: popover desativado (continua aceitando texto com @)
  const [createdBy, setCreatedBy] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [novoParecer, setNovoParecer] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [cmdOpenParecer, setCmdOpenParecer] = useState(false);
  const [cmdQueryParecer, setCmdQueryParecer] = useState("");
  const composerRef = useRef<UnifiedComposerHandle | null>(null);
  const [personType, setPersonType] = useState<'PF'|'PJ'|null>(null);
  // UI: tarefas/anexos em conversas
  const [taskOpen, setTaskOpen] = useState<{open:boolean, parentId?: string|null, taskId?: string|null, source?: 'parecer'|'conversa'}>({open:false});
  const [tasks, setTasks] = useState<CardTask[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentContextRef = useRef<{ commentId?: string | null; source?: 'parecer' | 'conversa' } | null>(null);
  const { role: currentUserRole } = useUserRole();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isVendor = (currentUserRole ?? "").toLowerCase() === "vendedor";
  const canWriteParecer = !isVendor;

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

  function triggerAttachmentPicker(context?: { commentId?: string | null; source?: 'parecer' | 'conversa'; inPlace?: boolean }) {
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
      // Se for Conversa, criar comentário apenas quando não for edição in-place
      let commentIdForUpload: string | null = context?.commentId ?? null;
      if (context?.source === 'conversa' && !(context?.inPlace && context?.commentId)) {
        const payload: any = { card_id: cardId, content: '' };
        if (context?.commentId) payload.parent_id = context.commentId;
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
        commentIdForUpload = c.id as string;
      } else if (context?.source === 'conversa' && context?.inPlace && context?.commentId) {
        // Edição in-place: substituir anexos existentes deste comentário e remover tarefas existentes
        try { await supabase.from('card_attachments').delete().eq('comment_id', context.commentId); } catch {}
        try { await supabase.from('card_tasks').delete().eq('comment_id', context.commentId); } catch {}
        // Limpar o texto atual para renderizar anexos inline (sem header duplicado)
        try { await supabase.from('card_comments').update({ content: '' }).eq('id', context.commentId); } catch {}
      }

      const uploaded = await Attach.uploadAttachmentBatch({
        cardId,
        commentId: commentIdForUpload,
        files: files.map((file) => {
          const dot = file.name.lastIndexOf(".");
          const baseName = dot > 0 ? file.name.slice(0, dot) : file.name;
          return { file, displayName: baseName || file.name };
        }),
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

  const refreshTasks = useCallback(async () => {
    try {
      const list = await listTasks(cardId);
      setTasks(list);
    } catch {}
  }, [cardId]);

  useEffect(() => {
    if (!cardId) return;
    let active = true;
    (async () => {
      if (!active) return;
      await refreshTasks();
    })();
    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return () => { active = false; };
    }
    const channel = supabase
      .channel(`editar-ficha-tasks-${cardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_tasks", filter: `card_id=eq.${cardId}` }, () => {
        refreshTasks();
      });
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        try { supabase.removeChannel(channel); } catch {}
      }
    });
    return () => {
      active = false;
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [cardId, refreshTasks]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        setCurrentUserId(uid);
      } catch {}
    })();
  }, [open]);

  useEffect(() => {
    if (!open || canWriteParecer) return;
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [open, canWriteParecer]);

  useEffect(() => {
    if (canWriteParecer) return;
    setCmdOpenParecer(false);
    setCmdQueryParecer("");
  }, [canWriteParecer]);

  const handleTaskToggle = useCallback(async (taskId: string, done: boolean) => {
    // Otimista: atualiza lista local imediatamente para uma UX fluida
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: done ? 'completed' : 'pending' } : t));
    try {
      await toggleTask(taskId, done);
      // Faz um refresh leve para sincronizar completed_at e estados vindos do backend
      await refreshTasks();
    } catch (e: any) {
      // Reverte em caso de erro
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: !done ? 'completed' : 'pending' } : t));
      alert(e?.message || "Falha ao atualizar tarefa");
    }
  }, [refreshTasks]);

  async function handleAttachmentInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await processAttachmentSelection(files);
  }

  async function syncDecisionStatus(decision: ComposerDecision | null) {
    try {
      await setCardDecision(cardId, decision);
      // Fallback: se triggers foram removidas, mova o card explicitamente no Kanban de Análise
      try {
        if (decision === 'aprovado') await changeStage(cardId, 'analise', 'aprovados');
        else if (decision === 'negado') await changeStage(cardId, 'analise', 'negados');
        else if (decision === 'reanalise') await changeStage(cardId, 'analise', 'reanalise');
      } catch {}
      // Atualiza o board
      try { onStageChange?.(); } catch {}
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

  // Ao fechar (ou trocar de ficha), permite nova inicialização na próxima abertura
  useEffect(() => {
    if (!open) bootRef.current = false;
  }, [open, applicantId, cardId]);

  // Listeners para abrir Task/Anexo a partir dos inputs de Parecer (respostas)
  useEffect(() => {
    function onOpenTask(event?: Event) {
      const detail = (event as CustomEvent<{ parentId?: string | null; taskId?: string | null; source?: 'parecer' | 'conversa'; inPlace?: boolean }> | undefined)?.detail;
      setTaskOpen({
        open: true,
        parentId: detail?.parentId ?? null,
        taskId: detail?.taskId ?? null,
        source: detail?.source ?? 'parecer',
        inPlace: detail?.inPlace ?? false,
      });
    }
    function onOpenAttach(event?: Event) {
      const detail = (event as CustomEvent<{ commentId?: string | null; source?: 'parecer' | 'conversa' }> | undefined)?.detail;
      triggerAttachmentPicker({
        commentId: detail?.commentId ?? null,
        source: detail?.source ?? 'parecer',
      });
    }
    window.addEventListener('mz-open-task', onOpenTask);
    window.addEventListener('mz-open-attach', onOpenAttach);
    return () => {
      window.removeEventListener('mz-open-task', onOpenTask);
      window.removeEventListener('mz-open-attach', onOpenAttach);
    };
  }, []);

  const flush = useCallback(async () => {
    if (!open) return;
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
  }, [open, applicantId, cardId]);

  const scheduleFlush = useDebouncedCallback(flush, 1800);

  const queue = useCallback((scope:'app'|'card', key:string, value:any) => {
    if (scope==='app') {
      pendingApp.current = { ...pendingApp.current, [key]: value };
    } else {
      pendingCard.current = { ...pendingCard.current, [key]: value };
    }
    scheduleFlush();
  }, [scheduleFlush]);

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

  const updateCardField = useCallback((key: 'due_at' | 'hora_at', value: any) => {
    dirtyCardFields.current.add(key);
    markFieldStatus(key, "pending");
    queue('card', key, value);
  }, [queue, markFieldStatus]);

  // (remoção) addParecer local substituído por services/addParecer e lógica inline

  const horarios = ["08:30","10:30","13:30","15:30"];
  // Exibe somente estados úteis; não mostra mais "Salvo" para evitar animação/jitter visual
  const statusText = useMemo(() => (
    saving === 'saving' ? 'Salvando…' : saving === 'error' ? 'Erro ao salvar' : ''
  ), [saving]);

  function openExpanded() {
    if (!applicantId) return;
    const isPJ = personType === 'PJ';
    const url = isPJ ? `/cadastro/pj/${applicantId}?card=${cardId}&from=analisar` : `/cadastro/pf/${applicantId}?card=${cardId}&from=analisar`;
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {}
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
      <div className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Conteúdo do modal: acima do Drawer/Sidebar (z-70) */}
      <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-hidden pt-8 pb-6 sm:pt-12 sm:pb-8" onClick={onClose}>
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
              <button type="button" onClick={openExpanded} className="btn-secondary-mznet no-hover whitespace-nowrap">
                Analisar
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
            {/* Informações Pessoais */}
            <Section title="Informações Pessoais" variant="info-pessoais">
              <Grid cols={2}>
                  <Field label={personType==='PJ' ? 'Razão Social' : 'Nome do Cliente'} value={app.primary_name||''} onChange={(v)=>{ updateAppField('primary_name', v); emitCardUpdate({ applicantName: v }); }} status={getFieldStatus('primary_name')} onBlur={handleFieldBlur} />
                {personType === 'PJ' ? (
                  <Field label="CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCnpj(v); updateAppField('cpf_cnpj', m); emitCardUpdate({ cpfCnpj: m }); }} inputMode="numeric" maxLength={18} status={getFieldStatus('cpf_cnpj')} onBlur={handleFieldBlur} />
                ) : (
                  <Field label="CPF" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCpf(v); updateAppField('cpf_cnpj', m); emitCardUpdate({ cpfCnpj: m }); }} inputMode="numeric" maxLength={14} status={getFieldStatus('cpf_cnpj')} onBlur={handleFieldBlur} />
                )}
              </Grid>
            </Section>

            {/* Contato */}
            <Section title="Informações de Contato" variant="info-contato">
              <Grid cols={2}>
                <Field label="Telefone" value={app.phone||''} onChange={(v)=>{ const m=maskPhoneLoose(v); updateAppField('phone', m); emitCardUpdate({ phone: m }); }} status={getFieldStatus('phone')} onBlur={handleFieldBlur} />
                <Field label="Whatsapp" value={app.whatsapp||''} onChange={(v)=>{ const m=maskPhoneLoose(v); updateAppField('whatsapp', m); emitCardUpdate({ whatsapp: m }); }} status={getFieldStatus('whatsapp')} onBlur={handleFieldBlur} />
              </Grid>
              <div className="mt-4 sm:mt-6">
                <Grid cols={1}>
                  <Field label="E-mail" value={app.email||''} onChange={(v)=>{ updateAppField('email', v); }} status={getFieldStatus('email')} onBlur={handleFieldBlur} />
                </Grid>
              </div>
            </Section>

            {/* Endereço */}
            <Section title="Endereço" variant="endereco">
              <Grid cols={2}>
                <div className="mt-1">
                  <Field label="Logradouro" value={app.address_line||''} onChange={(v)=>{ updateAppField('address_line', v); }} status={getFieldStatus('address_line')} onBlur={handleFieldBlur} />
                </div>
                <Field label="Número" value={app.address_number||''} onChange={(v)=>{ updateAppField('address_number', v); }} status={getFieldStatus('address_number')} onBlur={handleFieldBlur} />
              </Grid>
              <div className="mt-4 sm:mt-6">
                <Grid cols={3}>
                  <Field label="Complemento" value={app.address_complement||''} onChange={(v)=>{ updateAppField('address_complement', v); }} status={getFieldStatus('address_complement')} onBlur={handleFieldBlur} />
                  <div className="mt-1">
                    <Field label="Bairro" value={app.bairro||''} onChange={(v)=>{ updateAppField('bairro', v); emitCardUpdate({ bairro: v }); }} status={getFieldStatus('bairro')} onBlur={handleFieldBlur} />
                  </div>
                  <div className="mt-1">
                    <Field label="CEP" value={app.cep||''} onChange={(v)=>{ updateAppField('cep', v); }} status={getFieldStatus('cep')} onBlur={handleFieldBlur} />
                  </div>
                </Grid>
              </div>
            </Section>

            {/* Preferências e serviços */}
            <Section title="Planos e Serviços" variant="planos-servicos">
              <Grid cols={2}>
                <SelectAdv label="Plano de Internet" value={app.plano_acesso||''} onChange={(v)=>{ updateAppField('plano_acesso', v); }} options={PLANO_OPTIONS as any} contentStyle={{ zIndex: 9999 }} />
                <Select label="Dia de vencimento" value={String(app.venc||'')} onChange={(v)=>{ updateAppField('venc', v); }} options={VENC_OPTIONS as any} contentStyle={{ zIndex: 9999 }} />
                <SelectAdv label="SVA Avulso" value={app.sva_avulso||''} onChange={(v)=>{ updateAppField('sva_avulso', v); }} options={SVA_OPTIONS as any} contentStyle={{ zIndex: 9999 }} />
                <Select label="Carnê impresso" value={app.carne_impresso ? 'Sim':'Não'} onChange={(v)=>{ const val = (v==='Sim'); updateAppField('carne_impresso', val); }} options={["Sim","Não"]} contentStyle={{ zIndex: 9999 }} />
              </Grid>
            </Section>

            {/* Agendamento */}
            <Section title="Agendamento" variant="agendamento">
              <Grid cols={3}>
                <Field label="Feito em" value={createdAt} onChange={()=>{}} disabled />
                <DateSingleKanbanPopover
                  label="Instalação agendada para"
                  value={dueAt}
                  onChange={(val) => {
                    setDueAt(val || "");
                    if (!val) {
                      updateCardField('due_at', null);
                      emitCardUpdate({ dueAt: null });
                      return;
                    }
                    // Persistir meio-dia local para estabilizar a data (evita shift por fuso)
                    const noonUtc = localDateTimeToUtcISO(val, '12:00', DEFAULT_TIMEZONE);
                    updateCardField('due_at', noonUtc ?? null);
                    emitCardUpdate({ dueAt: noonUtc ?? null });
                  }}
                />
                <TimeMultiSelect
                  label="Horário"
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
                />
              </Grid>
            </Section>

            {/* Equipe Responsável */}
            <Section title="Equipe Responsável" variant="info-contato">
              <Grid cols={2}>
                <Field label="Vendedor" value={vendorName} onChange={()=>{}} disabled />
                <Field label="Analistas" value={analystName} onChange={()=>{}} disabled />
              </Grid>
            </Section>

            {/* Pareceres */}
            <div className="section-card rounded-xl p-4 sm:p-6">
              {/* Header Area - Red Box */}
              <div className="section-header mb-4 sm:mb-6 flex items-center justify-between">
                <h3 className="section-title text-sm font-semibold pareceres">Pareceres</h3>
              </div>
              
              {/* Content Area - Yellow Box */}
              <div className="section-content">
                <div className="mb-3 relative">
                  <UnifiedComposer
                    ref={composerRef}
                    disabled={!canWriteParecer}
                    placeholder="Escreva um novo parecer… Use @ para mencionar"
                    onChange={(val)=> {
                      setNovoParecer(val);
                    }}
                    onSubmit={!canWriteParecer ? undefined : async (val)=> {
                      const txt = (val.text || '').trim();
                      const hasDecision = !!val.decision;
                      if (!hasDecision && !txt) return;
                      const payloadText = hasDecision && !txt ? decisionPlaceholder(val.decision ?? null) : txt;
                      const resetValue: ComposerValue = { decision: null, text: '', mentions: [] };
                      setNovoParecer(resetValue);
                      requestAnimationFrame(() => composerRef.current?.setValue(resetValue));
                      setCmdOpenParecer(false);
                      try {
                        const { error } = await addParecer({ cardId, text: payloadText, parentId: null, decision: val.decision ?? null });
                        if (error) {
                          setNovoParecer(val);
                          requestAnimationFrame(() => composerRef.current?.setValue(val));
                          alert(error.message || 'Falha ao adicionar parecer');
                          return;
                        }
                        await refreshCardSnapshot();
                        if (val.decision === 'aprovado' || val.decision === 'negado') {
                          await syncDecisionStatus(val.decision);
                        } else if (val.decision === 'reanalise') {
                          await syncDecisionStatus('reanalise');
                        }
                      } catch (err: any) {
                        setNovoParecer(val);
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
                  {/* Menções desativadas em Parecer */}
                  {canWriteParecer && cmdOpenParecer && (
                    <div className="absolute z-50 left-0 bottom-full mb-2">
                      <CmdDropdown
                        items={[
                          { key:'aprovado', label:'Aprovado' },
                          { key:'negado', label:'Negado' },
                          { key:'reanalise', label:'Reanálise' },
                        ].filter(i=> i.key.includes(cmdQueryParecer))}
                        onPick={async (key)=>{
                          setCmdOpenParecer(false); setCmdQueryParecer('');
                          if (key==='aprovado' || key==='negado' || key==='reanalise') {
                            composerRef.current?.setDecision(key as any);
                            try {
                              await syncDecisionStatus(key as any);
                            } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                          }
                        }}
                        initialQuery={cmdQueryParecer}
                      />
                    </div>
                  )}
                </div>
                <PareceresList
                  cardId={cardId}
                  notes={data.pareceres as any}
                  profiles={profiles}
                  tasks={tasks}
                  applicantName={app?.primary_name ?? null}
                  currentUserId={currentUserId}
                  canWrite={canWriteParecer}
                  onReply={async (pid, value) => {
                    const text = (value.text || '').trim();
                    const hasDecision = !!value.decision;
                    if (!hasDecision && !text) return;
                    const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
                    const { error } = await addParecer({ cardId, text: payloadText, parentId: pid, decision: value.decision ?? null });
                    if (error) {
                      alert(error.message || "Falha ao adicionar parecer");
                      return;
                    }
                    await refreshCardSnapshot();
                    if (value.decision === 'aprovado' || value.decision === 'negado') {
                      await syncDecisionStatus(value.decision);
                    } else if (value.decision === 'reanalise') {
                      await syncDecisionStatus('reanalise');
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
                  onOpenTask={(ctx) => setTaskOpen({ open: true, parentId: ctx.parentId ?? null, taskId: ctx.taskId ?? null, source: ctx.source ?? 'parecer' })}
                  onToggleTask={handleTaskToggle}
                />
              </div>
            </div>
                </div>
              </div>
            </div>
            {/* Coluna Direita: conversas co-relacionadas (scroll próprio) */}
            <div className="w-[38%] min-w-[320px] flex-shrink-0 h-full min-h-0 border-l border-white/10" style={{ backgroundColor: 'rgba(255,230,204,0.8)' }}>
              <div className="h-full min-h-0 overflow-y-auto p-4">
                <Conversation
                  cardId={cardId}
                  applicantName={app?.primary_name ?? null}
                  onOpenTask={(parentId?: string, options?: { inPlace?: boolean }) => setTaskOpen({ open: true, parentId: parentId ?? null, taskId: null, source: 'conversa', inPlace: options?.inPlace ?? false })}
                  onOpenAttach={(parentId?: string, options?: { inPlace?: boolean }) => triggerAttachmentPicker({ commentId: parentId ?? null, source: 'conversa', inPlace: options?.inPlace ?? false })}
                  onEditTask={(taskId: string) => setTaskOpen({ open: true, parentId: null, taskId })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* Drawers/Modais auxiliares */}
      <TaskDrawer
        open={taskOpen.open}
        onClose={()=> setTaskOpen({open:false, parentId:null, taskId:null, source: undefined})}
        cardId={cardId}
        commentId={taskOpen.parentId ?? null}
        taskId={taskOpen.taskId ?? null}
        source={taskOpen.source ?? 'conversa'}
        inPlace={taskOpen.inPlace ?? false}
        onCreated={async ()=> {
          await refreshTasks();
        }}
      />
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

// Subcomponentes e utilitários extraídos para components/* e utils/*
/*
  cardId,
  notes,
  profiles,
  tasks,
  applicantName,
  onReply,
  onEdit,
  onDelete,
  onDecisionChange,
  onOpenTask,
  onToggleTask,
  currentUserId,
}: {
  cardId: string;
  notes: Note[];
  profiles: ProfileLite[];
  tasks: CardTask[];
  applicantName?: string | null;
  onReply: (parentId:string, value: ComposerValue)=>Promise<any>;
  onEdit: (id:string, value: ComposerValue)=>Promise<any>;
  onDelete: (id:string)=>Promise<any>;
  onDecisionChange: (decision: ComposerDecision | null) => Promise<void>;
  onOpenTask: (context: { parentId?: string | null; taskId?: string | null; source?: "parecer" | "conversa" }) => void;
  onToggleTask: (taskId: string, done: boolean) => Promise<void> | void;
  currentUserId?: string | null;
}) {
  const tree = useMemo(()=> buildTree(notes||[]), [notes]);
  return (
    <div className="space-y-2">
      {(!notes || notes.length===0) && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
      {tree.map(n => (
        <NoteItem
          key={n.id}
          cardId={cardId}
          node={n}
          depth={0}
          profiles={profiles}
          tasks={tasks}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onDecisionChange={onDecisionChange}
          onOpenTask={onOpenTask}
          onToggleTask={onToggleTask}
          applicantName={applicantName}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

function NoteItem({
  cardId,
  node,
  depth,
  profiles,
  tasks,
  applicantName,
  onReply,
  onEdit,
  onDelete,
  onDecisionChange,
  onOpenTask,
  onToggleTask,
  currentUserId,
}: {
  cardId: string;
  node: any;
  depth: number;
  profiles: ProfileLite[];
  tasks: CardTask[];
  applicantName?: string | null;
  onReply: (parentId:string, value: ComposerValue)=>Promise<any>;
  onEdit: (id:string, value: ComposerValue)=>Promise<any>;
  onDelete: (id:string)=>Promise<any>;
  onDecisionChange: (decision: ComposerDecision | null) => Promise<void>;
  onOpenTask: (context: { parentId?: string | null; taskId?: string | null; source?: "parecer" | "conversa" }) => void;
  onToggleTask: (taskId: string, done: boolean) => Promise<void> | void;
  currentUserId?: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const editRef = useRef<HTMLDivElement | null>(null);
  const replyRef = useRef<HTMLDivElement | null>(null);
  const editComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const replyComposerRef = useRef<UnifiedComposerHandle | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (isEditing && editRef.current && t && !editRef.current.contains(t)) {
        setIsEditing(false);
      }
      if (isReplying && replyRef.current && t && !replyRef.current.contains(t)) {
        setIsReplying(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isEditing, isReplying]);
  const [editValue, setEditValue] = useState<ComposerValue>({ decision: (node.decision as ComposerDecision | null) ?? null, text: node.text || '' });
  const [replyValue, setReplyValue] = useState<ComposerValue>({ decision: null, text: '', mentions: [] });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  // Compositor Unificado - edição
  // Menções desativadas para edição/resposta de parecer
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState('');
  useEffect(() => {
    if (!isEditing) {
      setEditValue({ decision: (node.decision as ComposerDecision | null) ?? null, text: node.text || '' });
    }
  }, [node.text, node.decision, isEditing]);
  useEffect(() => {
    if (!isEditing) {
      setEditCmdOpen(false);
    }
  }, [isEditing]);
  useEffect(() => {
    if (!isReplying) {
      setCmdOpen(false);
    }
  }, [isReplying]);
  useEffect(() => {
    if (!isReplying) return;
    const txt = replyValue.text || '';
    const m = txt.match(/\/([\w]*)$/);
    if (m) {
      setCmdQuery((m[1] || '').toLowerCase());
      setCmdOpen(true);
    } else {
      setCmdOpen(false);
      setCmdQuery('');
    }
  }, [replyValue.text, isReplying]);
  const ts = node.created_at ? new Date(node.created_at).toLocaleString() : '';
  const nodeTasks = useMemo(() => tasks.filter((t) => t.comment_id === node.id), [tasks, node.id]);
  const trimmedText = (node.text || '').trim();
  if (node.deleted) return null;
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-6 text-sm text-zinc-800 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] pl-3"
      style={{ marginLeft: depth*16, borderLeftColor: 'var(--verde-primario)', borderLeftWidth: '8px' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-medium">{node.author_name || '—'} <span className="ml-2 text-[11px] text-zinc-500">{ts}</span></div>
            {node.author_role && <div className="text-[11px] text-zinc-500 truncate">{node.author_role}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Responder"
            onClick={()=>{
              setIsReplying(prev => {
                const next = !prev;
                if (next) {
                  const initial: ComposerValue = { decision: null, text: '', mentions: [] };
                  setReplyValue(initial);
                  requestAnimationFrame(() => {
                    replyComposerRef.current?.setValue(initial);
                    replyComposerRef.current?.focus();
                  });
                } else {
                  setCmdOpen(false);
                }
                return next;
              });
            }}
            className="text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M4 12h16M12 4l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {currentUserId && node.author_id && node.author_id === currentUserId ? (
          <ParecerMenu
            onEdit={()=>{
              const initial: ComposerValue = { decision: (node.decision as ComposerDecision | null) ?? null, text: node.text || '', mentions: [] };
              setEditValue(initial);
              setIsEditing(true);
              requestAnimationFrame(() => {
                editComposerRef.current?.setValue(initial);
                editComposerRef.current?.focus();
              });
            }}
            onDelete={async ()=> { if (confirm('Excluir este parecer?')) { try { await onDelete(node.id); } catch(e:any){ alert(e?.message||'Falha ao excluir parecer'); } } }}
          />
          ) : null}
        </div>
      </div>
      {!isEditing ? (
        <div className="mt-1 space-y-2">
          {node.decision ? <DecisionTag decision={node.decision} /> : null}
          {trimmedText.length > 0 && (
            <div className="break-words">{renderTextWithChips(node.text)}</div>
          )}
        </div>
      ) : (
        <div className="mt-2" ref={editRef}>
          <div className="relative">
            <UnifiedComposer
              ref={editComposerRef}
              defaultValue={editValue}
              placeholder="Edite o parecer… Use @ para mencionar e / para comandos"
              onChange={(val)=> setEditValue(val)}
              onSubmit={async (val)=>{
                const trimmed = (val.text || '').trim();
                if (!trimmed) return;
                try {
                  await onEdit(node.id, val);
                  if (val.decision === 'aprovado' || val.decision === 'negado') {
                    await onDecisionChange(val.decision);
                  } else if (val.decision === 'reanalise') {
                    await onDecisionChange('reanalise');
                  }
                  setIsEditing(false);
                  setEditCmdOpen(false);
                } catch(e:any){ alert(e?.message||'Falha ao editar parecer'); }
              }}
              onCancel={()=> {
                setIsEditing(false);
                setEditCmdOpen(false);
              }}
              onCommandTrigger={(query)=>{
                setEditCmdQuery(query.toLowerCase());
                setEditCmdOpen(true);
              }}
              onCommandClose={()=> {
                setEditCmdOpen(false);
                setEditCmdQuery('');
              }}
            />
            {editCmdOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <CmdDropdown
                  items={[
                    { key:'aprovado', label:'Aprovado' },
                    { key:'negado', label:'Negado' },
                    { key:'reanalise', label:'Reanálise' },
                  ].filter(i=> i.key.includes(editCmdQuery) || i.label.toLowerCase().includes(editCmdQuery))}
                  onPick={async (key)=>{
                    setEditCmdOpen(false); setEditCmdQuery('');
                    if (key==='aprovado' || key==='negado' || key==='reanalise') {
                      editComposerRef.current?.setDecision(key as any);
                      try {
                        await onDecisionChange(key as any);
                      } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                    }
                  }}
                  initialQuery={editCmdQuery}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {nodeTasks.length > 0 && (
        <div className="mt-2 space-y-2">
          {nodeTasks.map((task) => {
            const creatorProfile = task.created_by
              ? profiles.find((p) => p.id === task.created_by)
              : null;
            const creatorName = creatorProfile?.full_name ?? "Colaborador";
            return (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={(id, done) => onToggleTask(id, done)}
                creatorName={creatorName}
                applicantName={applicantName}
                onEdit={() => onOpenTask({ parentId: node.id, taskId: task.id, source: "parecer" })}
              />
            );
          })}
        </div>
      )}
      {isReplying && (
        <div className="mt-2 flex gap-2 relative" ref={replyRef}>
          <div className="flex-1 relative">
            <UnifiedComposer
              ref={replyComposerRef}
              defaultValue={replyValue}
              placeholder="Responder... (/aprovado, /negado, /reanalise, /tarefa, /anexo)"
              onChange={(val)=> setReplyValue(val)}
              onSubmit={async (val)=>{
                const trimmed = (val.text || '').trim();
                if (!trimmed) return;
                try {
                  await onReply(node.id, val);
                  if (val.decision === 'aprovado' || val.decision === 'negado') {
                    await onDecisionChange(val.decision);
                  } else if (val.decision === 'reanalise') {
                    await onDecisionChange('reanalise');
                  }
                  const resetVal: ComposerValue = { decision: null, text: '', mentions: [] };
                  setReplyValue(resetVal);
                  replyComposerRef.current?.setValue(resetVal);
                  setIsReplying(false);
                  setCmdOpen(false);
                } catch(e:any){ alert(e?.message||'Falha ao responder parecer'); }
              }}
              onCancel={()=> {
                setIsReplying(false);
                setCmdOpen(false);
              }}
              onCommandTrigger={(query)=>{
                setCmdQuery(query.toLowerCase());
                setCmdOpen(true);
              }}
              onCommandClose={()=> {
                const txt = replyValue.text || '';
                if (txt.match(/\/([\w]*)$/)) {
                  setCmdOpen(true);
                } else {
                  setCmdOpen(false);
                  setCmdQuery('');
                }
              }}
            />
            {cmdOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <CmdDropdown
                  items={[
                    { key:'aprovado', label:'Aprovado' },
                    { key:'negado', label:'Negado' },
                    { key:'reanalise', label:'Reanálise' },
                    { key:'tarefa', label:'Tarefa' },
                    { key:'anexo', label:'Anexo' },
                  ].filter(i=> i.key.includes(cmdQuery))}
                  onPick={async (key)=>{
                    setCmdOpen(false); setCmdQuery('');
                    if (key==='aprovado' || key==='negado' || key==='reanalise') {
                      replyComposerRef.current?.setDecision(key as any);
                      try {
                        await onDecisionChange(key as any);
                      } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                      return;
                    }
                    if (key==='tarefa') {
                      onOpenTask({ parentId: node.id, source: "parecer" });
                      return;
                    }
                    if (key==='anexo') {
                      try {
                        const ev = new CustomEvent('mz-open-attach', { detail: { commentId: node.id, source: 'parecer' } });
                        window.dispatchEvent(ev);
                      } catch {}
                      return;
                    }
                  }}
                  initialQuery={cmdQuery}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {node.children && node.children.length>0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((c:any)=> (
            <NoteItem
              key={c.id}
              cardId={cardId}
              node={c}
              depth={depth+1}
              profiles={profiles}
              tasks={tasks}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onDecisionChange={onDecisionChange}
              onOpenTask={onOpenTask}
              onToggleTask={onToggleTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParecerMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (open && menuRef.current && t && !menuRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);
  return (
    <div className="relative" ref={menuRef}>
      <button 
        aria-label="Mais ações" 
        className="parecer-menu-trigger p-2 rounded-full hover:bg-zinc-100 transition-colors duration-200" 
        onClick={()=> setOpen(v=>!v)}
      >
        <MoreHorizontal className="w-4 h-4 text-zinc-600" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div className="parecer-menu-dropdown absolute right-0 top-10 z-[9999] w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 overflow-hidden">
            <button 
              className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors duration-150" 
              onClick={()=> { setOpen(false); onEdit(); }}
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <div className="h-px bg-zinc-100 mx-2" />
            <button 
              className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-150" 
              onClick={async ()=> { setOpen(false); await onDelete(); }}
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Utilitário local para obter a posição do caret no textarea
// MentionDropdownParecer removido: menções desativadas no Parecer
*/
