"use client";

import { useEffect, useState } from "react";
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
    <div className="fixed inset-0 z-50 flex" style={{ left: sidebarWidth }}>
      <div className="flex-1 bg-black/30" onClick={() => !disabled && onClose()}></div>
      <div className="w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-4 text-white">
          <h2 className="text-lg font-semibold">{isEdit ? 'Editar Tarefa' : 'Adicionar Tarefa'}</h2>
          <p className="text-sm text-white/90">{isEdit ? 'Atualize os dados da tarefa' : 'Crie uma nova tarefa para a equipe'}</p>
        </header>
        <div className="p-4 space-y-4">
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
