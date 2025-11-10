"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { addComment } from "@/features/comments/services";
import { useSidebar } from "@/components/ui/sidebar";
import { CalendarReady } from "@/components/ui/calendar-ready";
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
  onCreated?: (task: { id: string; description: string; assigned_to?: string | null; deadline?: string | null }) => void;
};

export function TaskDrawer({ open, onClose, cardId, commentId, taskId, onCreated }: TaskDrawerProps) {
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
          const { data: meData } = await supabase.from("profiles").select("id, full_name, role").eq("id", userId).single();
          setMe(meData as any);
        }
        const { data: list } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
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
    if (!desc.trim()) return;
    setSaving(true);
    try {
      const deadlineIso = resolveDeadlineISO();
      const payload: any = {
        card_id: cardId,
        description: desc.trim(),
        assigned_to: assignedTo || null,
        deadline: deadlineIso,
        comment_id: commentId ?? null,
      };
      const { data: created, error } = await supabase.from("card_tasks").insert(payload).select('id, assigned_to, deadline').single();
      if (error) throw error;
      // Notificações agora são geradas por triggers no backend para evitar duplicatas
      try { onCreated?.({ id: created.id, description: desc.trim(), assigned_to: created.assigned_to ?? null, deadline: created.deadline ?? null }); } catch {}
      // Comentário especial no feed de conversas (gera thread pai quando commentId não for passado)
      try {
        await addComment(cardId, `📋 Tarefa criada: ${desc.trim()}`, commentId ?? undefined);
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
      const { error } = await supabase
        .from('card_tasks')
        .update({ description: desc.trim(), assigned_to: assignedTo || null, deadline: deadlineIso })
        .eq('id', taskId);
      if (error) throw error;
      onClose();
    } catch (e:any) {
      alert(e?.message || 'Falha ao atualizar tarefa');
    } finally { setSaving(false); }
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
    <div className="pointer-events-none fixed inset-0 z-50 flex justify-start p-3 md:p-6" style={{ left: sidebarWidth }}>
      <div
        className="pointer-events-auto relative flex h-full max-h-[calc(100vh-24px)] shrink-0 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl animate-in slide-in-from-left duration-200 dark:border-neutral-700 dark:bg-neutral-900"
        style={{
          width: drawerWidth,
          minWidth: DRAWER_MIN_WIDTH,
          maxWidth: DRAWER_MAX_WIDTH,
        }}
      >
        <div
          role="presentation"
          aria-hidden="true"
          onMouseDown={handleResizeStart}
          className="absolute -right-3 top-0 bottom-0 flex w-3 cursor-col-resize items-center justify-center"
        >
          <span className="h-12 w-[3px] rounded-full bg-emerald-400/60 transition-colors hover:bg-emerald-500" />
        </div>
        <header className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-4 text-white">
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
          <section>
            <div className="text-sm font-semibold text-zinc-800 mb-2">Atribuição</div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-600">De</label>
                <input value={me?.full_name || ""} disabled className="w-full rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-600">Para</label>
                <select value={assignedTo} onChange={(e)=> setAssignedTo(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                  <option value="">Selecione um colaborador</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}{p.role ? ` · ${p.role}` : ""}</option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-zinc-500">● {available} colaborador(es) disponível(is)</div>
              </div>
            </div>
          </section>
          <section>
            <div className="text-sm font-semibold text-zinc-800 mb-2">Descrição</div>
            <textarea value={desc} onChange={(e)=> setDesc(e.target.value)} rows={4} placeholder="Ex.: Reagendar instalação para o dia 12/10 às 14h." className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </section>
          <section>
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
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                />
              </div>
            </div>
          </section>
        </div>
        <footer className="flex justify-end gap-2 border-t px-4 py-3">
          {isEdit && (
            <button onClick={deleteTask} disabled={disabled} className="mr-auto rounded border border-red-300 px-4 py-2 text-sm text-red-700">Excluir</button>
          )}
          <button onClick={onClose} disabled={disabled} className="rounded border border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          {!isEdit ? (
            <button onClick={createTask} disabled={disabled || !desc.trim()} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Criar Tarefa</button>
          ) : (
            <button onClick={updateTask} disabled={disabled || !desc.trim()} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Salvar Alterações</button>
          )}
        </footer>
      </div>
    </div>
  );
}
