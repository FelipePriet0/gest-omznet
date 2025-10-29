"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
};

export default function MinhasTarefasPage() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all'|'pending'|'completed'>('all');
  const [due, setDue] = useState<'all'|'hoje'|'amanha'|'atrasado'|'intervalo'>('all');
  const [ds, setDs] = useState('');
  const [de, setDe] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_my_tasks', {
        p_status: status==='all'? null : status,
        p_due: due==='all'? null : due,
        p_date_start: ds? atStart(ds) : null,
        p_date_end: de? atEnd(de) : null,
        p_search: q || null,
      });
      if (!error) setItems((data as any)||[]);
    } finally { setLoading(false); }
  }

  async function toggle(taskId: string, done: boolean) {
    // Otimista: atualiza visualmente sem recarregar a lista
    setItems(prev => prev.map(i => i.id === taskId ? { ...i, status: done ? 'completed' : 'pending' } : i));
    try {
      await supabase.rpc('update_my_task', { p_task_id: taskId, p_status: done? 'completed':'pending' });
    } catch (e) {
      // Em caso de erro, volta estado anterior e informa
      setItems(prev => prev.map(i => i.id === taskId ? { ...i, status: !done ? 'completed' : 'pending' } : i));
      alert('Não foi possível atualizar a tarefa.');
    }
  }

  async function remove(taskId: string) {
    if (!confirm('Excluir tarefa?')) return;
    await supabase.rpc('update_my_task', { p_task_id: taskId, p_delete: true });
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 px-6 py-5 text-white shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Minhas Tarefas</h1>
            <p className="text-sm text-white/90">Acompanhe e conclua suas tarefas</p>
          </div>
        </div>
      </section>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Busca</label>
            <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Descrição ou nome do cliente" className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
            <select value={status} onChange={(e)=> setStatus(e.target.value as any)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500">
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="completed">Concluídas</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Prazo</label>
            <select value={due} onChange={(e)=> setDue(e.target.value as any)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500">
              <option value="all">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="amanha">Amanhã</option>
              <option value="atrasado">Atrasadas</option>
              <option value="intervalo">Intervalo</option>
            </select>
          </div>
          {due==='intervalo' && (
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">De</label>
                <input type="date" value={ds} onChange={(e)=> setDs(e.target.value)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Até</label>
                <input type="date" value={de} onChange={(e)=> setDe(e.target.value)} className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}
          <div className="ml-auto">
            <button disabled={loading} onClick={load} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Aplicar</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-2 text-sm font-semibold text-gray-800">Tarefas</div>
        <div className="divide-y">
          {items.length===0 ? (
            <div className="px-4 py-6 text-sm text-zinc-600">Sem tarefas</div>
          ) : items.map(t => (
            <div key={t.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-5 sm:items-center">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={t.status==='completed'} onChange={(e)=> toggle(t.id, e.target.checked)} />
                <div>
                  <div className={`text-sm ${t.status==='completed' ? 'line-through text-emerald-700' : 'text-zinc-800'}`}>{t.description}</div>
                  <div className="text-xs text-zinc-500">{t.applicant_name} • {t.cpf_cnpj}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Prazo</div>
                <div className={`text-sm ${t.deadline && new Date(t.deadline) < new Date() && t.status!=='completed' ? 'text-red-600' : 'text-zinc-800'}`}>{t.deadline ? new Date(t.deadline).toLocaleString() : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Status</div>
                <div className="text-sm">{t.status==='completed' ? 'Concluída' : 'Pendente'}</div>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <a href={`${(t.area||'analise')==='analise' ? '/kanban/analise' : '/kanban'}?card=${t.card_id}`} className="rounded border border-zinc-300 px-3 py-1.5 text-sm">Abrir Ficha</a>
                <button onClick={()=> remove(t.id)} className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function atStart(d: string) { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.toISOString(); }
function atEnd(d: string) { const dt = new Date(d); dt.setHours(23,59,59,999); return dt.toISOString(); }
