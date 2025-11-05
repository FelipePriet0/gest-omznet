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

  async function load(nextStatus?: 'all'|'pending'|'completed') {
    setLoading(true);
    try {
      const effStatus = nextStatus ?? status;
      const { data, error } = await supabase.rpc('list_my_tasks', {
        p_status: effStatus==='all'? null : effStatus,
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

      <div className="relative">
        <div className="absolute top-0 left-0 z-10">
          <div className="flex items-center gap-2">
            <TaskFilterCTA 
              q={q} setQ={setQ}
              status={status} setStatus={setStatus}
              due={due} setDue={setDue}
              ds={ds} setDs={setDs}
              de={de} setDe={setDe}
              onApply={load}
              loading={loading}
            />
            {status !== 'all' && (
              <div className="flex gap-[1px] items-center text-xs">
                <div className="flex gap-1.5 shrink-0 rounded-l bg-neutral-200 px-1.5 py-1 items-center">
                  Status
                </div>
                <div className="bg-neutral-100 px-2 py-1 text-neutral-700">{status === 'pending' ? 'Pendentes' : 'Concluídas'}</div>
                <button
                  onClick={() => { setStatus('all'); load('all'); }}
                  className="bg-neutral-200 rounded-l-none rounded-r-sm h-6 w-6 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-300 transition shrink-0"
                  aria-label="Limpar filtro de status"
                >
                  ×
                </button>
              </div>
            )}
          </div>
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
          <div className="space-y-3">
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
              items.map(t => (
                <div key={t.id} className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200">
                  <div className="flex items-start gap-4">
                    {/* Checkbox customizado */}
                    <div className="flex-shrink-0 pt-1">
                      <label className="relative flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={t.status === 'completed'} 
                          onChange={(e) => toggle(t.id, e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                          t.status === 'completed' 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : 'border-gray-300 hover:border-emerald-400'
                        }`}>
                          {t.status === 'completed' && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </label>
                    </div>
                    
                    {/* Conteúdo principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium leading-5 ${
                            t.status === 'completed' 
                              ? 'line-through text-gray-500' 
                              : 'text-gray-900'
                          }`}>
                            {t.description}
                          </h3>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {t.applicant_name}
                            </span>
                            <span>•</span>
                            <span>{t.cpf_cnpj}</span>
                            {t.area && (
                              <>
                                <span>•</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  t.area === 'comercial' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {t.area === 'comercial' ? 'Comercial' : 'Análise'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Status e prazo */}
                        <div className="flex items-center gap-4 text-xs">
                          {t.deadline && (
                            <div className="text-right">
                              <div className="text-gray-500">Prazo</div>
                              <div className={`font-medium ${
                                t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed' 
                                  ? 'text-red-600' 
                                  : 'text-gray-700'
                              }`}>
                                {new Date(t.deadline).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          )}
                          
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {t.status === 'completed' ? 'Concluída' : 'Pendente'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Ações */}
                      <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <a 
                          href={`${(t.area||'analise')==='analise' ? '/kanban/analise' : '/kanban'}?card=${t.card_id}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Abrir Ficha
                        </a>
                        <button 
                          onClick={() => remove(t.id)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
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
