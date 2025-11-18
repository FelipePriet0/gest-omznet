"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { addComment } from "@/features/comments/services";
import { useSidebar } from "@/components/ui/sidebar";
import { CalendarReady } from "@/components/ui/calendar-ready";
import { Search } from "lucide-react";
import { TABLE_PROFILES, TABLE_CARD_COMMENTS } from "@/lib/constants";
import {
  DEFAULT_TIMEZONE,
  clampToBusinessWindow,
  isWithinBusinessWindow,
  localDateTimeToUtcISO,
  startOfDayUtcISO,
  utcISOToLocalParts,
} from "@/lib/datetime";

const DRAWER_WIDTH_STORAGE_KEY = "mznet-task-drawer-width";
const DRAWER_MIN_WIDTH = 320;
const DRAWER_MAX_WIDTH = 640;
const DRAWER_DEFAULT_WIDTH = 420;

function clampWidth(value: number) {
  return Math.min(Math.max(value, DRAWER_MIN_WIDTH), DRAWER_MAX_WIDTH);
}

type ProfileLite = { id: string; full_name: string; role?: string | null };

export type TaskDrawerProps = {
  open: boolean;
  onClose: () => void;
  cardId: string;
  commentId?: string | null;
  taskId?: string | null;
  source?: "parecer" | "conversa";
  inPlace?: boolean;
  onCreated?: (task: {
    id: string;
    description: string;
    assigned_to?: string | null;
    deadline?: string | null;
    comment_id?: string | null;
    source: "parecer" | "conversa";
  }) => void;
};

export function TaskDrawer({ open, onClose, cardId, commentId, taskId, source = "conversa", inPlace = false, onCreated }: TaskDrawerProps) {
  const { open: sidebarOpen } = useSidebar();
  const [me, setMe] = useState<ProfileLite | null>(null);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [deadlineDate, setDeadlineDate] = useState<string>("");
  const [deadlineTime, setDeadlineTime] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(0);
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const resizeOriginRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: DRAWER_DEFAULT_WIDTH });
  const isEdit = !!taskId;
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignFilter, setAssignFilter] = useState("");

  // Update sidebar width on changes
  useEffect(() => {
    const updateWidth = () => {
      const isDesktop = window.innerWidth >= 768;
      setSidebarWidth(isDesktop ? (sidebarOpen ? 300 : 60) : 0);
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [sidebarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY);
      if (stored) {
        const parsed = Number.parseInt(stored, 10);
        if (!Number.isNaN(parsed)) {
          setDrawerWidth(clampWidth(parsed));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(drawerWidth));
    } catch {}
  }, [drawerWidth, open]);

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const { startX, startWidth } = resizeOriginRef.current;
      const delta = event.clientX - startX;
      const next = clampWidth(startWidth + delta);
      setDrawerWidth(next);
    };
    const handleMouseUp = () => {
      resizeOriginRef.current = { startX: 0, startWidth: drawerWidth };
      setResizing(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.removeProperty("cursor");
    };
  }, [resizing, drawerWidth]);

  useEffect(() => {
    if (!open) {
      setResizing(false);
    }
  }, [open]);

  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      resizeOriginRef.current = { startX: event.clientX, startWidth: drawerWidth };
      setResizing(true);
    },
    [drawerWidth]
  );

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (userId) {
          const { data: meData } = await supabase.from(TABLE_PROFILES).select("id, full_name, role").eq("id", userId).single();
          setMe(meData as any);
        }
        const { data: list } = await supabase.from(TABLE_PROFILES).select("id, full_name, role").order("full_name");
        setProfiles((list as any) ?? []);
        if (taskId) {
          const { data: t } = await supabase.from('card_tasks').select('assigned_to, description, deadline').eq('id', taskId).single();
          if (t) {
            setAssignedTo((t as any).assigned_to ?? '');
            setDesc((t as any).description ?? '');
          if ((t as any).deadline) {
            const { dateISO, time } = utcISOToLocalParts((t as any).deadline, DEFAULT_TIMEZONE);
            setDeadlineDate(dateISO ?? "");
            setDeadlineTime(time ?? "");
          } else {
            setDeadlineDate("");
            setDeadlineTime("");
          }
          }
        } else {
        setAssignedTo('');
        setDesc('');
        setDeadlineDate('');
        setDeadlineTime('');
        }
      } catch {}
    })();
  }, [open, taskId]);

  function resolveDeadlineISO(): string | null {
    if (!deadlineDate) return null;
    if (deadlineTime) {
      const normalized = clampToBusinessWindow(deadlineTime);
      if (!isWithinBusinessWindow(deadlineTime)) {
        setDeadlineTime(normalized);
      }
      return localDateTimeToUtcISO(deadlineDate, normalized, DEFAULT_TIMEZONE) ?? null;
    }
    return startOfDayUtcISO(deadlineDate, DEFAULT_TIMEZONE) ?? null;
  }

  async function createTask() {
    const trimmedDesc = desc.trim();
    if (!trimmedDesc) return;
    setSaving(true);
    try {
      // LEI 1 - HIERARQUIA: Validar comment_id antes de criar tarefa (prevenir órfãos)
      if (commentId) {
        try {
          const { data, error } = await supabase
            .from(TABLE_CARD_COMMENTS)
            .select("id, card_id, deleted_at")
            .eq("id", commentId)
            .eq("card_id", cardId)
            .is("deleted_at", null)
            .single();
          
          if (error || !data) {
            throw new Error("Comentário não encontrado ou foi deletado. Não é possível criar tarefa órfã.");
          }
        } catch (err: any) {
          if (err.message.includes("Comentário não encontrado")) {
            throw err;
          }
          // Se for outro erro, continua (pode ser que commentId seja null/undefined)
        }
      }

      const deadlineIso = resolveDeadlineISO();
      const creatorName = (me?.full_name || "").trim() || "Um colaborador";
      const creatorRole = me?.role || null;
      // Buscar o nome e role do assigned_to
      const assigneeProfile = assignedTo ? profiles.find((p) => p.id === assignedTo) : null;
      const assigneeName = assigneeProfile?.full_name || "um colaborador";
      const assigneeRole = assigneeProfile?.role || null;
      // Formatar texto com roles
      const creatorPart = creatorRole ? `${creatorName} (${creatorRole})` : creatorName;
      const assigneePart = assigneeRole ? `${assigneeName} (${assigneeRole})` : assigneeName;
      const commentText = `${creatorPart} criou uma tarefa para ${assigneePart}.`;
      let threadRefId: string | null = null;
      if (source === "parecer") {
        const { data: cardRow, error: rpcError } = await supabase.rpc("add_parecer", {
          p_card_id: cardId,
          p_text: commentText,
          p_parent_id: commentId ?? null,
          p_decision: null,
        });
        if (rpcError) throw rpcError;
        const notes = (cardRow as any)?.reanalysis_notes as Array<Record<string, any>> | undefined;
        if (Array.isArray(notes)) {
          const reversed = [...notes].reverse();
          const match = reversed.find((note) => {
            if (!note) return false;
            const sameText = (note.text || "").trim() === commentText.trim();
            if (!sameText) return false;
            if (me?.id && note.author_id) return note.author_id === me.id;
            return true;
          });
          if (match?.id) {
            threadRefId = String(match.id);
          } else if (reversed[0]?.id) {
            threadRefId = String(reversed[0].id);
          }
        }
      } else {
        try {
          if (inPlace && commentId) {
            // Transformar este comentário em tarefa: limpar anexos, tarefas antigas e texto, e usar o mesmo comment_id
            try { await supabase.from('card_attachments').delete().eq('comment_id', commentId); } catch {}
            try { await supabase.from('card_tasks').delete().eq('comment_id', commentId); } catch {}
            try { await supabase.from(TABLE_CARD_COMMENTS).update({ content: '' }).eq('id', commentId); } catch {}
            threadRefId = commentId;
          } else {
            // Conversa: criar nó de comentário vazio para que a tarefa apareça inline como conteúdo
            threadRefId = await addComment(cardId, "", commentId ?? undefined);
          }
        } catch (err: any) {
          throw new Error(err?.message || "Falha ao registrar comentário da tarefa");
        }
      }
      if (!threadRefId) {
        threadRefId = commentId ?? null;
      }
      const payload: any = {
        card_id: cardId,
        description: trimmedDesc,
        assigned_to: assignedTo || null,
        deadline: deadlineIso,
        comment_id: threadRefId,
      };
      const { data: created, error } = await supabase.from("card_tasks").insert(payload).select('id, assigned_to, deadline').single();
      if (error) {
        if (threadRefId) {
          if (source === "parecer") {
            try {
              await supabase.rpc("delete_parecer", { p_card_id: cardId, p_note_id: threadRefId });
            } catch {}
          } else {
            try { await supabase.from(TABLE_CARD_COMMENTS).delete().eq("id", threadRefId); } catch {}
          }
        }
        throw error;
      }
      // Notificações agora são geradas por triggers no backend para evitar duplicatas
      try {
        onCreated?.({
          id: created.id,
          description: trimmedDesc,
          assigned_to: created.assigned_to ?? null,
          deadline: created.deadline ?? null,
          comment_id: threadRefId ?? null,
          source,
        });
      } catch {}
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Falha ao criar tarefa");
    } finally {
      setSaving(false);
    }
  }

  async function updateTask() {
    if (!taskId) return;
    if (!desc.trim()) return;
    setSaving(true);
    try {
      const deadlineIso = resolveDeadlineISO();
      
      // 1. Fazer UPDATE primeiro (sem select para evitar erro 406)
      const { error: updateError } = await supabase
        .from('card_tasks')
        .update({ 
          description: desc.trim(), 
          assigned_to: assignedTo || null, 
          deadline: deadlineIso 
        })
        .eq('id', taskId);
      
      // Se o UPDATE falhar, já para aqui
      if (updateError) {
        throw new Error(updateError.message || 'Falha ao atualizar tarefa');
      }
      
      // 2. Tentar buscar dados atualizados separadamente (opcional, para atualizar UI)
      // Se não conseguir, não é crítico - o realtime subscription vai atualizar
      const { data: updated } = await supabase
        .from('card_tasks')
        .select('id, description, assigned_to, deadline, comment_id')
        .eq('id', taskId)
        .maybeSingle(); // ← Não quebra se não retornar (evita erro 406)
      
      // 3. Chamar onCreated se conseguir os dados, senão confia no realtime
      if (updated) {
        try {
          onCreated?.({
            id: updated.id,
            description: updated.description,
            assigned_to: updated.assigned_to ?? null,
            deadline: updated.deadline ?? null,
            comment_id: updated.comment_id ?? null,
            source,
          });
        } catch {}
      }
      
      // 4. Fechar modal (o realtime subscription vai atualizar a UI automaticamente)
      onClose();
    } catch (e: any) {
      alert(e?.message || 'Falha ao atualizar tarefa');
    } finally { 
      setSaving(false); 
    }
  }

  async function deleteTask() {
    if (!taskId) return;
    if (!confirm('Excluir tarefa? Esta ação não pode ser desfeita.')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('card_tasks').delete().eq('id', taskId);
      if (error) throw error;
      onClose();
    } catch (e:any) { alert(e?.message||'Falha ao excluir tarefa'); } finally { setSaving(false); }
  }

  if (!open) return null;
  const available = profiles.length;
  const disabled = saving;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/30" onClick={() => !disabled && onClose()} />
      <div className="relative mx-auto my-6 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-zinc-200 bg-[var(--color-neutral)] shadow-2xl">
        <header className="bg-emerald-600 px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{isEdit ? 'Editar Tarefa' : 'Adicionar Tarefa'}</h2>
              <p className="text-sm text-white/90">{isEdit ? 'Atualize os dados da tarefa' : 'Crie uma nova tarefa para a equipe'}</p>
            </div>
            <button
              type="button"
              onClick={() => !disabled && onClose()}
              className="rounded-full p-1 text-white/80 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Fechar painel de tarefas"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section className="rounded-lg bg-white p-4">
            <div className="text-sm font-semibold text-zinc-800 mb-2">Atribuição</div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-600">De</label>
                <input value={me?.full_name || ""} disabled className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-600">Para</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAssignOpen((v) => !v)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-left text-sm outline-none focus:border-emerald-500"
                  >
                    {assignedTo
                      ? (profiles.find((p) => p.id === assignedTo)?.full_name ?? "—")
                      : "Selecione um colaborador"}
                  </button>
                  {assignOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg p-[6px]">
                      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 rounded-t-lg">
                        <Search className="w-4 h-4 text-zinc-500" />
                        <input
                          value={assignFilter}
                          onChange={(e) => setAssignFilter(e.target.value)}
                          placeholder="Buscar pessoa…"
                          className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                        />
                      </div>
                      <div className="max-h-56 overflow-auto py-1">
                        {(profiles || [])
                          .filter((p) => (p.full_name || "").toLowerCase().includes(assignFilter.toLowerCase()))
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setAssignedTo(p.id);
                                setAssignOpen(false);
                                setAssignFilter("");
                              }}
                              className="group m-[2px] flex w-[calc(100%-4px)] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--verde-primario)] hover:text-white"
                            >
                              <span className="transition-colors group-hover:text-white">{p.full_name}{p.role ? ` · ${p.role}` : ""}</span>
                            </button>
                          ))}
                        {profiles.filter((p) => (p.full_name || "").toLowerCase().includes(assignFilter.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-zinc-500">Sem resultados</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">● {available} colaborador(es) disponível(is)</div>
              </div>
            </div>
          </section>
          <section className="rounded-lg bg-white p-4">
            <div className="text-sm font-semibold text-zinc-800 mb-2">Descrição</div>
            <textarea value={desc} onChange={(e)=> setDesc(e.target.value)} rows={4} placeholder="Ex.: Reagendar instalação para o dia 12/10 às 14h." className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </section>
          <section className="rounded-lg bg-white p-4">
            <div className="text-sm font-semibold text-zinc-800 mb-2">Prazo</div>
            <div className="space-y-3">
              <CalendarReady
                label="Data"
                value={deadlineDate || undefined}
                onChange={(value) => {
                  const next = value ?? "";
                  setDeadlineDate(next);
                  if (!value) {
                    setDeadlineTime("");
                  }
                }}
                disablePast
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-600">Horário (08:00–18:00)</label>
                <input
                  type="time"
                  value={deadlineTime}
                  min="08:00"
                  max="18:00"
                  step={1800}
                  disabled={!deadlineDate}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) {
                      setDeadlineTime("");
                      return;
                    }
                    const normalized = clampToBusinessWindow(raw);
                    setDeadlineTime(normalized);
                  }}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                />
              </div>
            </div>
          </section>
        </div>
        <footer className="flex justify-end gap-2 px-4 py-3">
          <button onClick={onClose} disabled={disabled} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          {!isEdit ? (
            <button onClick={createTask} disabled={disabled || !desc.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Criar Tarefa</button>
          ) : (
            <button onClick={updateTask} disabled={disabled || !desc.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Salvar Alterações</button>
          )}
        </footer>
      </div>
    </div>
  );
}
