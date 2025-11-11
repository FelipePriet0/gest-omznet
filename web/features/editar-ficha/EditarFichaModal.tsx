"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent, useCallback, Fragment } from "react";
import Image from "next/image";
import clsx from "clsx";
import { User as UserIcon, MoreHorizontal, CheckCircle, XCircle, RefreshCcw, ClipboardList, Paperclip, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Conversation } from "@/features/comments/Conversation";
import { TaskDrawer } from "@/features/tasks/TaskDrawer";
import { TaskCard } from "@/features/tasks/TaskCard";
import { listTasks, toggleTask, type CardTask } from "@/features/tasks/services";
import { changeStage } from "@/features/kanban/services";
import {
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_MAX_SIZE,
  uploadAttachmentBatch,
} from "@/features/attachments/upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarReady } from "@/components/ui/calendar-ready";
import { SimpleSelect } from "@/components/ui/select";
import { TimeMultiSelect } from "@/components/ui/time-multi-select";
import { UnifiedComposer, type ComposerDecision, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import { listProfiles, type ProfileLite } from "@/features/comments/services";
import { useSidebar } from "@/components/ui/sidebar";
import { DEFAULT_TIMEZONE, startOfDayUtcISO, utcISOToLocalParts } from "@/lib/datetime";
import { renderTextWithChips } from "@/utils/richText";

type AppModel = {
  primary_name?: string; cpf_cnpj?: string; phone?: string; whatsapp?: string; email?: string;
  address_line?: string; address_number?: string; address_complement?: string; cep?: string; bairro?: string;
  plano_acesso?: string; venc?: string | number | null; carne_impresso?: boolean; sva_avulso?: string;
};

// Dropdown contents (mesmos do Expanded)
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

const VENC_OPTIONS = ["5","10","15","20","25"] as const;

export function EditarFichaModal({ open, onClose, cardId, applicantId, onStageChange }: { open: boolean; onClose: () => void; cardId: string; applicantId: string; onStageChange?: () => void; }) {
  const { open: sidebarOpen } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [app, setApp] = useState<AppModel>({});
  const [dueAt, setDueAt] = useState<string>("");
  const [horaAt, setHoraAt] = useState<string>("");
  const [horaArr, setHoraArr] = useState<string[]>([]);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [pareceres, setPareceres] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);

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
  const [mentionOpenParecer, setMentionOpenParecer] = useState(false);
  const [mentionFilterParecer, setMentionFilterParecer] = useState("");
  const [createdBy, setCreatedBy] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const vendorName = useMemo(()=> profiles.find(p=> p.id===createdBy)?.full_name || "—", [profiles, createdBy]);
  const analystName = useMemo(()=> profiles.find(p=> p.id===assigneeId)?.full_name || "—", [profiles, assigneeId]);
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
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const timer = useRef<NodeJS.Timeout | null>(null);
  const pendingApp = useRef<Partial<AppModel>>({});
  const pendingCard = useRef<any>({});

  function triggerAttachmentPicker(context?: { commentId?: string | null; source?: 'parecer' | 'conversa' }) {
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
        cardId,
        commentId: context?.commentId ?? null,
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
            p_card_id: cardId,
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
    const channel = supabase
      .channel(`editar-ficha-tasks-${cardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_tasks", filter: `card_id=eq.${cardId}` }, () => {
        refreshTasks();
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [cardId, refreshTasks]);

  // Para usuários com role 'vendedor', focar o compositor de Parecer ao abrir (KISS: comportamento simples e útil)
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        setCurrentUserId(uid);
        const me = profiles.find((p) => p.id === uid);
        const role = (me?.role || null) as string | null;
        setCurrentUserRole(role);
        if (role === 'vendedor') {
          requestAnimationFrame(() => composerRef.current?.focus());
        }
      } catch {}
    })();
  }, [open, profiles]);

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
      if (decision === null) {
        await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: null });
      } else if (decision === 'reanalise') {
        await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'reanalise' });
      } else {
        await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: decision });
      }
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

  useEffect(() => {
    if (!open) return;
    let active = true;
    let chApp: any; let chCard: any;
    (async () => {
      try {
        setLoading(true);
        const { data: a } = await supabase
          .from('applicants')
          .select('primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, person_type')
          .eq('id', applicantId)
          .single();
        const { data: c } = await supabase
          .from('kanban_cards')
          .select('created_at, due_at, hora_at, reanalysis_notes, created_by, assignee_id')
          .eq('id', cardId)
          .single();
        if (!active) return;
        const a2:any = { ...(a||{}) };
        if (a2 && typeof a2.venc !== 'undefined' && a2.venc !== null) a2.venc = String(a2.venc);
        setApp(a2||{});
        setPersonType((a as any)?.person_type ?? null);
        setCreatedAt(c?.created_at ? new Date(c.created_at).toLocaleString() : "");
        const dueParts = utcISOToLocalParts(c?.due_at ?? undefined, DEFAULT_TIMEZONE);
        setDueAt(dueParts.dateISO ?? "");
        if (Array.isArray((c as any)?.hora_at)) {
          const arr:any[] = (c as any).hora_at;
          const list = arr.map(h => String(h).slice(0,5));
          setHoraArr(list);
          setHoraAt(list[0] || "");
        } else {
          const v = c?.hora_at ? String(c.hora_at).slice(0,5) : "";
          setHoraAt(v);
          setHoraArr(v ? [v] : []);
        }
        setPareceres(Array.isArray(c?.reanalysis_notes) ? c!.reanalysis_notes as any : []);
        setCreatedBy((c as any)?.created_by || "");
        setAssigneeId((c as any)?.assignee_id || "");

        try {
          setProfiles(await listProfiles());
        } catch {}

        // Realtime: applicants (payload.new) and kanban_cards
        chApp = supabase
          .channel(`rt-edit-app-${applicantId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applicants', filter: `id=eq.${applicantId}` }, (payload: any) => {
            const row:any = payload.new || {};
            const a3:any = { ...app };
            ['primary_name','cpf_cnpj','phone','whatsapp','email','address_line','address_number','address_complement','cep','bairro','plano_acesso','sva_avulso','carne_impresso','venc','person_type'].forEach((k)=>{
              if (k in row) (a3 as any)[k] = row[k];
            });
            if (typeof a3.venc !== 'undefined' && a3.venc !== null) a3.venc = String(a3.venc);
            setApp(a3);
            if (row.person_type) setPersonType(row.person_type);
          })
          .subscribe();

        chCard = supabase
          .channel(`rt-edit-card-${cardId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kanban_cards', filter: `id=eq.${cardId}` }, (payload: any) => {
            const row:any = payload.new || {};
            if (row.due_at) {
              const { dateISO } = utcISOToLocalParts(row.due_at, DEFAULT_TIMEZONE);
              setDueAt(dateISO ?? "");
            }
            if (row.hora_at) {
              const arr = Array.isArray(row.hora_at) ? row.hora_at : [row.hora_at];
              const list = arr.map((h:any)=> String(h).slice(0,5));
              setHoraAt(list[0] || "");
              setHoraArr(list);
            }
            if (Array.isArray(row.reanalysis_notes)) setPareceres(row.reanalysis_notes);
            if (typeof row.created_by !== 'undefined') setCreatedBy(row.created_by || "");
            if (typeof row.assignee_id !== 'undefined') setAssigneeId(row.assignee_id || "");
          })
          .subscribe();
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
    // cleanup channels on close/unmount
  }, [open, cardId, applicantId]);

  useEffect(() => {
    if (!open) return;
    const channels = supabase.getChannels?.() || [];
    return () => { try { channels.forEach((c:any)=> supabase.removeChannel(c)); } catch {} };
  }, [open, cardId, applicantId]);

  // Listeners para abrir Task/Anexo a partir dos inputs de Parecer (respostas)
  useEffect(() => {
    function onOpenTask(event?: Event) {
      const detail = (event as CustomEvent<{ parentId?: string | null; taskId?: string | null; source?: 'parecer' | 'conversa' }> | undefined)?.detail;
      setTaskOpen({
        open: true,
        parentId: detail?.parentId ?? null,
        taskId: detail?.taskId ?? null,
        source: detail?.source ?? 'parecer',
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

  async function flush() {
    if (!open) return;
    const ap = pendingApp.current; const cp = pendingCard.current;
    pendingApp.current = {}; pendingCard.current = {};
    if (Object.keys(ap).length === 0 && Object.keys(cp).length === 0) return;
    setSaving('saving');
    try {
      if (Object.keys(ap).length > 0) {
        const patch:any = { ...ap };
        if (typeof patch.venc !== 'undefined') { const n = parseInt(String(patch.venc),10); patch.venc = Number.isFinite(n) ? n : null; }
        await supabase.from('applicants').update(patch).eq('id', applicantId);
      }
      if (Object.keys(cp).length > 0) {
        await supabase.from('kanban_cards').update(cp).eq('id', cardId);
      }
      setSaving('saved'); setTimeout(()=> setSaving('idle'), 1000);
    } catch { setSaving('error'); }
  }

  function queue(scope:'app'|'card', key:string, value:any) {
    if (scope==='app') pendingApp.current = { ...pendingApp.current, [key]: value };
    else pendingCard.current = { ...pendingCard.current, [key]: value };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  }

  async function addParecer(val?: ComposerValue) {
    const payload = val ?? novoParecer;
    const txt = (payload.text || "").trim();
    const hasDecision = !!payload.decision;
    if (!hasDecision && !txt) return;
    const payloadText = hasDecision && !txt ? decisionPlaceholder(payload.decision ?? null) : txt;
    const resetValue: ComposerValue = { decision: null, text: "", mentions: [] };
    setNovoParecer(resetValue);
    requestAnimationFrame(() => composerRef.current?.setValue(resetValue));
    setMentionOpenParecer(false);
    setCmdOpenParecer(false);
    try {
      await supabase.rpc('add_parecer', {
        p_card_id: cardId,
        p_text: payloadText,
        p_parent_id: null,
        p_decision: payload.decision ?? null
      });
      if (payload.decision === 'aprovado' || payload.decision === 'negado') {
        await syncDecisionStatus(payload.decision);
      } else if (payload.decision === 'reanalise') {
        await syncDecisionStatus('reanalise');
      }
      // Realtime vai atualizar a lista
    } catch (err: any) {
      setNovoParecer(payload);
      requestAnimationFrame(() => composerRef.current?.setValue(payload));
      alert(err?.message || 'Falha ao adicionar parecer');
    }
  }

  const horarios = ["08:30","10:30","13:30","15:30"];
  const statusText = useMemo(()=> saving==='saving'? 'Salvando…' : saving==='saved'? 'Salvo' : saving==='error'? 'Erro ao salvar' : '', [saving]);

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
      <div className="relative w-[96vw] sm:w-[95vw] max-w-[980px] max-h-[90vh] bg-[var(--neutro)] shadow-2xl flex flex-col overflow-hidden" style={{ borderRadius: '28px' }} onClick={(e)=> e.stopPropagation()}>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain modal-scroll scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
        <div className="p-6 pb-12 sm:pb-16">
        {statusText && (
          <div className="mb-6 mt-3 text-sm font-medium" style={{ color: 'var(--verde-primario)' }}>{statusText}</div>
        )}

        {loading ? (
          <div className="text-sm text-zinc-600">Carregando…</div>
        ) : (
          <div className="space-y-6">
            {/* Informações Pessoais */}
            <Section title="Informações Pessoais" variant="info-pessoais">
              <Grid cols={2}>
                <Field label={personType==='PJ' ? 'Razão Social' : 'Nome do Cliente'} value={app.primary_name||''} onChange={(v)=>{ setApp({...app, primary_name:v}); queue('app','primary_name', v); }} />
                {personType === 'PJ' ? (
                  <Field label="CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCnpj(v); setApp({...app, cpf_cnpj:m}); queue('app','cpf_cnpj', m); }} inputMode="numeric" maxLength={18} />
                ) : (
                  <Field label="CPF" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCpf(v); setApp({...app, cpf_cnpj:m}); queue('app','cpf_cnpj', m); }} inputMode="numeric" maxLength={14} />
                )}
              </Grid>
            </Section>

            {/* Contato */}
            <Section title="Informações de Contato" variant="info-contato">
              <Grid cols={2}>
                <Field label="Telefone" value={app.phone||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, phone:m}); queue('app','phone', m); }} />
                <Field label="Whatsapp" value={app.whatsapp||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, whatsapp:m}); queue('app','whatsapp', m); }} />
              </Grid>
              <div className="mt-4 sm:mt-6">
                <Grid cols={1}>
                  <Field label="E-mail" value={app.email||''} onChange={(v)=>{ setApp({...app, email:v}); queue('app','email', v); }} />
                </Grid>
              </div>
            </Section>

            {/* Endereço */}
            <Section title="Endereço" variant="endereco">
              <Grid cols={2}>
                <div className="mt-1">
                  <Field label="Logradouro" value={app.address_line||''} onChange={(v)=>{ setApp({...app, address_line:v}); queue('app','address_line', v); }} />
                </div>
                <Field label="Número" value={app.address_number||''} onChange={(v)=>{ setApp({...app, address_number:v}); queue('app','address_number', v); }} />
              </Grid>
              <div className="mt-4 sm:mt-6">
                <Grid cols={3}>
                  <Field label="Complemento" value={app.address_complement||''} onChange={(v)=>{ setApp({...app, address_complement:v}); queue('app','address_complement', v); }} />
                  <div className="mt-1">
                    <Field label="Bairro" value={app.bairro||''} onChange={(v)=>{ setApp({...app, bairro:v}); queue('app','bairro', v); }} />
                  </div>
                  <div className="mt-1">
                    <Field label="CEP" value={app.cep||''} onChange={(v)=>{ setApp({...app, cep:v}); queue('app','cep', v); }} />
                  </div>
                </Grid>
              </div>
            </Section>

            {/* Preferências e serviços */}
            <Section title="Planos e Serviços" variant="planos-servicos">
              <Grid cols={2}>
                <SelectAdv label="Plano de Internet" value={app.plano_acesso||''} onChange={(v)=>{ setApp({...app, plano_acesso:v}); queue('app','plano_acesso', v); }} options={PLANO_OPTIONS as any} />
                <Select label="Dia de vencimento" value={String(app.venc||'')} onChange={(v)=>{ setApp({...app, venc:v}); queue('app','venc', v); }} options={VENC_OPTIONS as any} />
                <SelectAdv label="SVA Avulso" value={app.sva_avulso||''} onChange={(v)=>{ setApp({...app, sva_avulso:v}); queue('app','sva_avulso', v); }} options={SVA_OPTIONS as any} />
                <Select label="Carnê impresso" value={app.carne_impresso ? 'Sim':'Não'} onChange={(v)=>{ const val = (v==='Sim'); setApp({...app, carne_impresso:val}); queue('app','carne_impresso', val); }} options={["Sim","Não"]} />
              </Grid>
            </Section>

            {/* Agendamento */}
            <Section title="Agendamento" variant="agendamento">
              <Grid cols={3}>
                <Field label="Feito em" value={createdAt} onChange={()=>{}} disabled />
                <CalendarReady
                  label="Instalação agendada para"
                  value={dueAt}
                  onChange={(val)=> {
                    setDueAt(val ?? "");
                    if (!val) {
                      queue('card','due_at', null);
                      return;
                    }
                    const utcValue = startOfDayUtcISO(val, DEFAULT_TIMEZONE);
                    queue('card','due_at', utcValue ?? null);
                  }}
                />
                <TimeMultiSelect
                  label="Horário"
                  times={horarios}
                  value={horaArr}
                  onApply={(vals)=> {
                    setHoraArr(vals);
                    setHoraAt(vals[0] || "");
                    if (vals.length === 0) queue('card','hora_at', null);
                    else queue('card','hora_at', vals.map(v=> `${v}:00`));
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
                    placeholder="Escreva um novo parecer… Use @ para mencionar"
                    onChange={(val)=> {
                      setNovoParecer(val);
                    }}
                    onSubmit={(val)=> {
                      addParecer(val);
                    }}
                    onCancel={()=> {
                      setCmdOpenParecer(false);
                      setMentionOpenParecer(false);
                    }}
                    onMentionTrigger={(query)=>{
                      setMentionFilterParecer(query.trim());
                      setMentionOpenParecer(true);
                    }}
                    onMentionClose={()=> {
                      setMentionOpenParecer(false);
                    }}
                    onCommandTrigger={(query)=>{
                      setCmdQueryParecer(query.toLowerCase());
                      setCmdOpenParecer(true);
                    }}
                    onCommandClose={()=> {
                      setCmdOpenParecer(false);
                      setCmdQueryParecer("");
                    }}
                  />
                  {mentionOpenParecer && (
                    <div className="absolute z-50 left-0 bottom-full mb-2">
                      <MentionDropdownParecer
                        items={profiles.filter((p)=> p.full_name.toLowerCase().includes(mentionFilterParecer.toLowerCase()) && p.id !== currentUserId)}
                        onPick={(p)=> {
                      composerRef.current?.insertMention({ id: p.id, label: p.full_name });
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
                  notes={pareceres as any}
                  profiles={profiles}
                  tasks={tasks}
                  applicantName={app?.primary_name ?? null}
                  currentUserId={currentUserId}
                  onReply={async (pid, value) => {
                    const text = (value.text || '').trim();
                    const hasDecision = !!value.decision;
                    if (!hasDecision && !text) return;
                    const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
                    await supabase.rpc('add_parecer', {
                      p_card_id: cardId,
                      p_text: payloadText,
                      p_parent_id: pid,
                      p_decision: value.decision ?? null,
                    });
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
                    await supabase.rpc('edit_parecer', {
                      p_card_id: cardId,
                      p_note_id: id,
                      p_text: payloadText,
                      p_decision: value.decision ?? null,
                    });
                    if (value.decision === 'aprovado' || value.decision === 'negado') {
                      await syncDecisionStatus(value.decision);
                    } else if (value.decision === 'reanalise') {
                      await syncDecisionStatus('reanalise');
                    }
                  }}
                  onDelete={async (id) => { await supabase.rpc('delete_parecer', { p_card_id: cardId, p_note_id: id }); }}
                  onDecisionChange={syncDecisionStatus}
                  onOpenTask={(ctx) => setTaskOpen({ open: true, parentId: ctx.parentId ?? null, taskId: ctx.taskId ?? null, source: ctx.source ?? 'parecer' })}
                  onToggleTask={handleTaskToggle}
                />
              </div>
            </div>

            {/* Conversas co-relacionadas */}
            <div className="mt-6">
              <Conversation
                cardId={cardId}
                applicantName={app?.primary_name ?? null}
                onOpenTask={(parentId?: string) => setTaskOpen({ open: true, parentId: parentId ?? null, taskId: null, source: 'conversa' })}
                onOpenAttach={(parentId?: string) => triggerAttachmentPicker({ commentId: parentId ?? null, source: 'conversa' })}
                onEditTask={(taskId: string) => setTaskOpen({ open: true, parentId: null, taskId })}
              />
            </div>
          </div>
        )}
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
        accept={ATTACHMENT_ALLOWED_TYPES.join(",")}
      />
    </Fragment>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
  variant?: string;
  className?: string;
  titleClassName?: string;
  cardClassName?: string;
};

function Section({ title, children, variant, className, titleClassName, cardClassName }: SectionProps) {
  const wrapperClasses = [variant, className].filter(Boolean).join(" ");
  const cardClasses = ["section-card rounded-lg bg-white p-4 sm:p-6", cardClassName].filter(Boolean).join(" ");
  const headingClasses = ["section-title text-sm font-semibold", titleClassName, variant].filter(Boolean).join(" ");

  return (
    <section className={wrapperClasses || undefined}>
      <div className={cardClasses}>
        <div className="section-header mb-4 sm:mb-6">
          <h3 className={headingClasses}>{title}</h3>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

function Grid({ cols, children }: { cols: 1|2|3; children: React.ReactNode }) {
  const cls = cols===1? 'grid-cols-1' : cols===2? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return <div className={`grid gap-4 sm:gap-6 ${cls}`}>{children}</div>;
}

function Field({ label, value, onChange, disabled, placeholder, maxLength, inputMode }: { label: string; value: string; onChange: (v:string)=>void; disabled?: boolean; placeholder?: string; maxLength?: number; inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"] }) {
  const id = `fld-${label.replace(/\s+/g,'-').toLowerCase()}`;
  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id} className="field-label text-h1">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e)=> onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`mt-1 h-12 rounded-lg px-5 py-3 ${disabled ? 'field-input-disabled' : ''}`}
      />
    </div>
  );
}

type Opt = string | { label: string; value: string; disabled?: boolean };
function Select({ label, value, onChange, options, triggerClassName, contentClassName, triggerStyle, contentStyle }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[]; triggerClassName?: string; contentClassName?: string; triggerStyle?: React.CSSProperties; contentStyle?: React.CSSProperties }) {
  const id = `sel-${label.replace(/\s+/g,'-').toLowerCase()}`;
  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id} className="field-label text-h1">{label}</Label>
      <SimpleSelect
        value={value}
        onChange={(v)=> onChange(v)}
        options={options}
        placeholder=""
        className="mt-1"
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
        triggerStyle={triggerStyle}
        contentStyle={contentStyle}
      />
    </div>
  );
}

function SelectAdv({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[] }) {
  return <Select label={label} value={value} onChange={onChange} options={options} />
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
          {decisions.map((i) => {
            let variantCls = '';
            if (i.key === 'negado') variantCls = 'cmd-menu-item--destructive';
            else if (i.key === 'aprovado') variantCls = 'cmd-menu-item--primary';
            else if (i.key === 'reanalise') variantCls = 'cmd-menu-item--warning';
            return (
              <button
                key={i.key}
                onClick={() => onPick(i.key)}
                className={`cmd-menu-item ${variantCls} flex w-full items-center gap-2 px-2 py-1.5 text-left`}
              >
                {iconFor(i.key)}
                <span>{i.label}</span>
              </button>
            );
          })}
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

const DECISION_META: Record<string, { label: string; className: string }> = {
  aprovado: { label: 'Aprovado', className: 'decision-chip--primary' },
  negado: { label: 'Negado', className: 'decision-chip--destructive' },
  reanalise: { label: 'Reanálise', className: 'decision-chip--warning' },
};

function decisionPlaceholder(decision: ComposerDecision | string | null | undefined) {
  return decision ? `[decision:${decision}]` : '';
}

function DecisionTag({ decision }: { decision?: string | null }) {
  if (!decision) return null;
  const meta = DECISION_META[decision];
  if (!meta) return null;
  return <span className={clsx('decision-chip', meta.className)}>{meta.label}</span>;
}

type Note = { id: string; text: string; author_id?: string | null; author_name?: string; author_role?: string|null; created_at?: string; parent_id?: string|null; level?: number; deleted?: boolean; decision?: ComposerDecision | string | null };
function buildTree(notes: Note[]): Note[] {
  const byId = new Map<string, any>();
  const normalizeText = (note: any) => {
    if (!note) return '';
    if (!note.decision) return note.text || '';
    const placeholder = decisionPlaceholder(note.decision as any);
    return note.text === placeholder ? '' : (note.text || '');
  };
  notes.forEach(n => byId.set(n.id, { ...n, text: normalizeText(n), children: [] as any[] }));
  const roots: any[] = [];
  notes.forEach(n => {
    const node = byId.get(n.id)!;
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id).children.push(node); else roots.push(node);
  });
  const sortFn = (a:any,b:any)=> new Date(a.created_at||'').getTime() - new Date(b.created_at||'').getTime();
  const sortTree = (arr:any[]) => { arr.sort(sortFn); arr.forEach(x=> sortTree(x.children)); };
  sortTree(roots);
  return roots as any;
}

function PareceresList({
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
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  // Compositor Unificado - edição
  const [editMentionOpen, setEditMentionOpen] = useState(false);
  const [editMentionFilter, setEditMentionFilter] = useState('');
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState('');
  useEffect(() => {
    if (!isEditing) {
      setEditValue({ decision: (node.decision as ComposerDecision | null) ?? null, text: node.text || '' });
    }
  }, [node.text, node.decision, isEditing]);
  useEffect(() => {
    if (!isEditing) {
      setEditMentionOpen(false);
      setEditCmdOpen(false);
    }
  }, [isEditing]);
  useEffect(() => {
    if (!isReplying) {
      setMentionOpen(false);
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
                  setMentionOpen(false);
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
                  setEditMentionOpen(false);
                  setEditCmdOpen(false);
                } catch(e:any){ alert(e?.message||'Falha ao editar parecer'); }
              }}
              onCancel={()=> {
                setIsEditing(false);
                setEditMentionOpen(false);
                setEditCmdOpen(false);
              }}
              onMentionTrigger={(query)=>{
                setEditMentionFilter(query.trim());
                setEditMentionOpen(true);
              }}
              onMentionClose={()=> setEditMentionOpen(false)}
              onCommandTrigger={(query)=>{
                setEditCmdQuery(query.toLowerCase());
                setEditCmdOpen(true);
              }}
              onCommandClose={()=> {
                setEditCmdOpen(false);
                setEditCmdQuery('');
              }}
            />
            {editMentionOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <MentionDropdownParecer
                  items={profiles.filter((p)=> (p.full_name||'').toLowerCase().includes(editMentionFilter.toLowerCase()) && p.id !== currentUserId)}
                  onPick={(p)=>{
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
                  setMentionOpen(false);
                  setCmdOpen(false);
                } catch(e:any){ alert(e?.message||'Falha ao responder parecer'); }
              }}
              onCancel={()=> {
                setIsReplying(false);
                setMentionOpen(false);
                setCmdOpen(false);
              }}
              onMentionTrigger={(query)=>{
                setMentionFilter(query.trim());
                setMentionOpen(true);
              }}
              onMentionClose={()=> setMentionOpen(false)}
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
            {mentionOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <MentionDropdownParecer
                  items={(profiles || []).filter((p)=> (p.full_name||'').toLowerCase().includes(mentionFilter.toLowerCase()) && p.id !== currentUserId)}
                  onPick={(p)=> {
                    replyComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                    setMentionOpen(false);
                    setMentionFilter("");
                  }}
                />
              </div>
            )}
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
function MentionDropdownParecer({ items, onPick }: { items: ProfileLite[]; onPick: (p: ProfileLite) => void }) {
  const [q, setQ] = useState("");
  const filtered = items.filter((p) => p.full_name.toLowerCase().includes(q.toLowerCase()));
  const order: Array<{key: string; label: string}> = [
    { key: 'vendedor', label: 'Vendedor' },
    { key: 'analista', label: 'Analista' },
    { key: 'gestor',   label: 'Gestor' },
  ];
  const byRole = (role: string) => filtered.filter((p) => (p.role || '').toLowerCase() === role);
  const hasAny = order.some(({key}) => byRole(key).length > 0);
  return (
    <div className="cmd-menu-dropdown mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar pessoas…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
      </div>
      {!hasAny ? (
        <div className="px-3 py-2 text-zinc-500">Sem resultados</div>
      ) : (
        order.map(({key,label}) => {
          const list = byRole(key);
          if (list.length === 0) return null;
          return (
            <div key={key} className="py-1">
              <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">{label}</div>
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left"
                >
                  <span>{p.full_name}{p.role ? ` (${p.role})` : ''}</span>
                </button>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
