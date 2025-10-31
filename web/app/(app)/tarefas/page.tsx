"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TaskFilterCTA } from "@/components/app/task-filter-cta";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState as useModalState } from "react";
import { PersonTypeModal } from "@/legacy/components/cadastro/components/PersonTypeModal";
import { BasicInfoModal } from "@/legacy/components/cadastro/components/BasicInfoModal";
import type { PessoaTipo } from "@/features/cadastro/types";

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
  
  // Nova ficha modals
  const [openPersonType, setOpenPersonType] = useModalState(false);
  const [openBasicInfo, setOpenBasicInfo] = useModalState(false);
  const [tipoSel, setTipoSel] = useModalState<PessoaTipo | null>(null);

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
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Minhas Tarefas</h1>
      </div>

      <div className="relative">
        <div className="absolute top-0 left-0 z-10">
          <TaskFilterCTA 
            q={q} setQ={setQ}
            status={status} setStatus={setStatus}
            due={due} setDue={setDue}
            ds={ds} setDs={setDs}
            de={de} setDe={setDe}
            onApply={load}
            loading={loading}
          />
        </div>
        <div className="absolute top-0 right-0 z-10">
          <Button
            onClick={() => setOpenPersonType(true)}
            className="h-6 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="size-3 mr-1" />
            Nova ficha
          </Button>
        </div>
        <div className="pt-12">
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
                <a href={`${(t.area||'analise')==='analise' ? '/kanban/analise' : '/kanban'}?card=${t.card_id}`} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors">Abrir Ficha</a>
                <button onClick={()=> remove(t.id)} className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors">Excluir</button>
              </div>
            </div>
          ))}
          </div>
        </div>
        </div>
      </div>
      
      {/* Modals de Cadastro */}
      <PersonTypeModal
        open={openPersonType}
        onClose={() => setOpenPersonType(false)}
        onSelect={(tipo) => {
          setTipoSel(tipo);
          setOpenPersonType(false);
          setOpenBasicInfo(true);
        }}
      />
      <BasicInfoModal
        open={openBasicInfo}
        tipo={tipoSel}
        onBack={() => {
          setOpenBasicInfo(false);
          setOpenPersonType(true);
        }}
        onClose={() => {
          setOpenBasicInfo(false);
          setTipoSel(null);
        }}
      />
    </>
  );
}

function atStart(d: string) { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.toISOString(); }
function atEnd(d: string) { const dt = new Date(d); dt.setHours(23,59,59,999); return dt.toISOString(); }
