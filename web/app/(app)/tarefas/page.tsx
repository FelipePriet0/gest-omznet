"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Check, Circle, X } from "lucide-react";
import { TaskFilterCTA } from "@/components/app/task-filter-cta";
// Nova ficha CTA removido do Drawer: Minhas Tarefas

type TaskRow = {
  id: string;
  description: string;
  status: 'pending'|'completed';
  deadline?: string|null;
  created_at?: string|null;
  card_id: string;
  applicant_id: string;
  applicant_name: string;
  cpf_cnpj: string;
  area?: 'comercial'|'analise'|string;
  created_by?: string|null;
  created_name?: string|null;
  creator_role?: 'vendedor'|'analista'|'gestor'|null;
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTimeFromDate(date: Date) {
  const datePart = date.toLocaleDateString("pt-BR");
  const timePart = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (timePart === "00:00") {
    return datePart;
  }
  return `${datePart} às ${timePart}`;
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  return date ? formatDateTimeFromDate(date) : null;
}

export default function MinhasTarefasPage() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [status, setStatus] = useState<'all'|'pending'|'completed'>('all');
  const [counts, setCounts] = useState<{pending:number; completed:number}>({ pending: 0, completed: 0 });
  
  // Removidos modais/estado de "Nova ficha" no Drawer

  useEffect(() => { load(); loadCounts(); }, []);

  async function loadCounts() {
    try {
      const { data, error } = await supabase.rpc('my_tasks_counts');
      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        const p = Number(row?.pending ?? 0);
        const c = Number(row?.completed ?? 0);
        setCounts({ pending: isFinite(p)? p:0, completed: isFinite(c)? c:0 });
      }
    } catch {}
  }

  async function load(nextStatus?: 'all'|'pending'|'completed') {
    const effStatus = nextStatus ?? status;
    const { data, error } = await supabase.rpc('list_my_tasks', {
      p_status: effStatus === 'all' ? null : effStatus,
    });
    if (!error) setItems((data as any)||[]);
  }

  async function toggle(taskId: string, done: boolean) {
    // Otimista: atualiza visualmente sem recarregar a lista
    setItems(prev => prev.map(i => i.id === taskId ? { ...i, status: done ? 'completed' : 'pending' } : i));
    try {
      await supabase.rpc('update_my_task', { p_task_id: taskId, p_status: done? 'completed':'pending' });
      // refresh counters (not tied to filters)
      loadCounts();
    } catch (e) {
      // Em caso de erro, volta estado anterior e informa
      setItems(prev => prev.map(i => i.id === taskId ? { ...i, status: !done ? 'completed' : 'pending' } : i));
      alert('Não foi possível atualizar a tarefa.');
    }
  }

  return (
    <>

      <div className="relative">
        <div className="absolute top-0 left-0 z-10">
          <div className="flex items-center gap-2">
            <TaskFilterCTA 
              status={status} setStatus={setStatus}
              onApply={load}
            />
            {status !== 'all' && (
              <div
                className="inline-flex items-center gap-2 rounded-none px-3 py-1 text-white shadow-sm text-xs"
                style={{
                  backgroundColor: "var(--color-primary)",
                  border: "1px solid var(--color-primary)",
                }}
              >
                <span className="font-semibold">Status</span>
                <span className="font-medium capitalize">
                  {status === 'pending' ? 'Pendentes' : 'Concluídas'}
                </span>
                <button
                  onClick={() => { setStatus('all'); load('all'); }}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-none text-white transition"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    border: "1px solid transparent",
                  }}
                  aria-label="Limpar filtro de status"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        {/* CTA "Nova ficha" removido no Drawer */}
        <div className="pt-12">
          {/* Mini dashboard: A fazer / Concluídas (não dependem do filtro) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 w-full mb-6">
            <DashboardCard title="A avaliar" value={counts.pending} icon={<Circle className="w-4 h-4 text-white" />} />
            <DashboardCard title="Concluídas" value={counts.completed} icon={<Check className="w-4 h-4 text-white" />} />
          </div>
          <div className="space-y-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma tarefa encontrada</h3>
                <p className="text-sm text-gray-500">Suas tarefas aparecerão aqui quando forem atribuídas</p>
              </div>
            ) : (
              items.map((t) => {
                const cardHref = `${(t.area || 'analise') === 'analise' ? '/kanban/analise' : '/kanban'}?card=${t.card_id}`;
                const isDone = t.status === 'completed';
                const createdLabel = formatDateTime(t.created_at);
                const deadlineDate = parseDate(t.deadline);
                const deadlineLabel = deadlineDate ? formatDateTimeFromDate(deadlineDate) : null;
                const isOverdue = !isDone && deadlineDate ? deadlineDate.getTime() < Date.now() : false;
                const creatorLabel = (t.created_name ?? "").trim() || t.created_by || "—";
                const cardToneClass = isDone
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
                  : "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100";
                const checkboxHoverClass = isDone ? "hover:bg-white/10" : "hover:bg-white";
                const checkboxFrameClass = isDone
                  ? "border-white/80 bg-white/10"
                  : "border-blue-400 bg-white group-hover:border-blue-500";
                const descriptionClass = isDone
                  ? "text-white break-all line-through decoration-white/60"
                  : "text-blue-900 break-all";
                const metaColumnClass = isDone
                  ? "flex flex-col items-end gap-1 text-[13px] text-right break-all text-white/90 line-through decoration-white/60"
                  : "flex flex-col items-end gap-1 text-[13px] text-right break-all text-blue-700";
                const metaLabelClass = isDone ? "text-white/80" : "text-blue-600";
                const metaValueClass = isDone ? "text-white" : isOverdue ? "text-red-600" : "text-blue-900";
                const chipClass = isDone
                  ? "inline-flex items-center rounded-full px-1.5 py-0.5 text-[13px] font-medium border border-white/40 bg-white/20 text-white"
                  : "inline-flex items-center rounded-full px-1.5 py-0.5 text-[13px] font-medium border border-blue-200 bg-white/70 text-blue-700";
                const createdLineClass = isDone
                  ? "mt-1 text-[13px] text-white/90 break-all line-through decoration-white/60"
                  : "mt-1 text-[13px] text-blue-700 break-all";
                const createdValueClass = isDone
                  ? "font-medium text-white break-all"
                  : "font-medium text-blue-900 break-all";
                return (
                  <div key={t.id} className="relative">
                    {/* Card 1: Primary_name + Data e Hora de criação */}
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between mb-3 gap-3">
                        <span className="flex-1 font-medium text-gray-900 break-words leading-snug">{t.applicant_name || "—"}</span>
                        {createdLabel && (
                          <span className="text-sm text-gray-500 text-right break-words">{createdLabel}</span>
                        )}
                      </div>
                      
                      {/* Card 2: Checkbox (dentro do Card 1) */}
                      <a
                        href={cardHref}
                        className={`group block rounded-md border px-3 py-2 transition-all duration-200 ${cardToneClass}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <label className={`relative -m-1 block cursor-pointer rounded-md p-1.5 transition-colors duration-200 ${checkboxHoverClass}`}>
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={(e) => toggle(t.id, e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200 ${checkboxFrameClass}`}>
                                {isDone && (
                                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </label>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`flex-1 text-[15px] font-medium ${descriptionClass}`}>
                                Descrição: {t.description}
                              </p>
                              <div className={metaColumnClass}>
                                {deadlineLabel && (
                                  <div className="text-right">
                                    <div className={metaLabelClass}>Prazo</div>
                                    <div className={`font-medium ${metaValueClass}`}>
                                      {deadlineLabel}
                                    </div>
                                  </div>
                                )}
                                <span className={chipClass}>
                                  {isDone ? "Concluída" : "Pendente"}
                                </span>
                              </div>
                            </div>
                            <div className={createdLineClass}>
                              <span>Criado por: </span>
                              <span className={createdValueClass}>{creatorLabel}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Modais de cadastro removidos do Drawer */}
    </>
  );
}

function DashboardCard({ title, value, icon }: { title: string; value?: number | null; icon?: React.ReactNode }) {
  return (
    <div className="h-[120px] w-full rounded-[12px] border bg-white border-zinc-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header Band (faixa de cabeçalho) */}
      <div className="bg-[#000000] px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-medium text-white">{title}</div>
        {icon && <div className="text-white">{icon}</div>}
      </div>
      {/* Área do número */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-3xl font-bold text-[var(--verde-primario)]">{typeof value === 'number' ? value : '—'}</div>
      </div>
    </div>
  );
}

