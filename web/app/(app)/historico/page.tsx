"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DateRangePicker } from "@/features/historico/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState as useModalState } from "react";
import { PersonTypeModal } from "@/legacy/components/cadastro/components/PersonTypeModal";
import { BasicInfoModal } from "@/legacy/components/cadastro/components/BasicInfoModal";
import type { PessoaTipo } from "@/features/cadastro/types";

type Row = {
  id: string;
  applicant_id: string;
  applicant_name: string;
  cpf_cnpj: string;
  final_decision: string | null;
  finalized_at: string | null;
  archived_at: string | null;
  vendedor_id: string | null;
  vendedor_name: string | null;
  analista_id: string | null;
  analista_name: string | null;
};

type ProfileLite = { id: string; full_name: string; role: string | null };

export default function HistoricoPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [resp, setResp] = useState<string>("");
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Nova ficha modals
  const [openPersonType, setOpenPersonType] = useModalState(false);
  const [openBasicInfo, setOpenBasicInfo] = useModalState(false);
  const [tipoSel, setTipoSel] = useModalState<PessoaTipo | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const ps = await listProfiles();
        setProfiles(ps);
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function load() {
    const params: any = { p_search: q || null };
    if (dateStart) params.p_date_start = atStart(dateStart);
    if (dateEnd) params.p_date_end = atEnd(dateEnd);
    params.p_status = status || null;
    params.p_responsavel = resp || null;
    const { data, error } = await supabase.rpc('list_historico', params);
    if (!error) setRows((data as any) || []);
  }

  async function openDetails(cardId: string) {
    const { data, error } = await supabase.rpc('get_historico_details', { p_card_id: cardId });
    if (!error) { setDetail(data); setDetailOpen(true); }
  }

  const respOptions = useMemo(() => profiles.filter(p => (p.role||'').toLowerCase() === 'analista' || (p.role||'').toLowerCase() === 'gestor'), [profiles]);

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <Button
          onClick={() => setOpenPersonType(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="size-4 mr-2" />
          Nova ficha
        </Button>
      </div>
      
      <div className="space-y-6">
        <Filters 
          q={q} onQ={setQ}
          dateStart={dateStart} onDateStart={setDateStart}
          dateEnd={dateEnd} onDateEnd={setDateEnd}
          status={status} onStatus={setStatus}
          resp={resp} onResp={setResp}
          respOptions={respOptions}
          onApply={load}
          loading={loading}
        />
        <HistoricoList rows={rows} onOpenDetails={openDetails} />
      </div>

      {detailOpen && detail && (
        <DetailsModal data={detail} onClose={()=> setDetailOpen(false)} />
      )}
      
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

function Filters({ q, onQ, dateStart, onDateStart, dateEnd, onDateEnd, status, onStatus, resp, onResp, respOptions, onApply, loading }: any) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Busca por nome</label>
          <input value={q} onChange={(e)=> onQ(e.target.value)} placeholder="Nome do titular" className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-700">Período</label>
          <DateRangePicker start={dateStart||undefined} end={dateEnd||undefined} onChange={(s,e)=> { onDateStart(s||""); onDateEnd(e||""); }} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Status da análise</label>
          <select value={status} onChange={(e)=> onStatus(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500">
            <option value=""></option>
            <option value="aprovados">Aprovado</option>
            <option value="negados">Negado</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Responsável por Análise</label>
          <select value={resp} onChange={(e)=> onResp(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500">
            <option value=""></option>
            {respOptions.map((p: ProfileLite)=> <option key={p.id} value={p.id}>{p.full_name} {p.role ? `· ${p.role}`:''}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button disabled={loading} onClick={onApply} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Aplicar filtros</button>
      </div>
    </div>
  );
}

function HistoricoList({ rows, onOpenDetails }: { rows: Row[]; onOpenDetails: (cardId: string) => void }) {
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma ficha encontrada</h3>
          <p className="text-sm text-gray-500">O histórico de fichas finalizadas aparecerá aqui</p>
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
            <div className="flex items-start justify-between">
              {/* Informações principais */}
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {r.applicant_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {r.cpf_cnpj}
                      </span>
                      {r.finalized_at && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0v1m0-1h6m-6 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1" />
                            </svg>
                            {new Date(r.finalized_at).toLocaleDateString('pt-BR')}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Equipe responsável */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      {r.vendedor_name && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                          </svg>
                          {r.vendedor_name}
                        </span>
                      )}
                      {r.analista_name && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {r.analista_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status badge */}
                  <div className="flex-shrink-0">
                    <StatusBadge value={r.final_decision} />
                  </div>
                </div>
                
                {/* Ações no hover */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    onClick={() => onOpenDetails(r.id)} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function DetailsModal({ data, onClose }: { data: any; onClose: () => void }) {
  const card = data?.card || {};
  const app = data?.applicant || {};
  const vendedor = data?.vendedor || {};
  const analista = data?.analista || {};
  const pareceres: any[] = Array.isArray(data?.pareceres) ? data.pareceres : [];

  function openResgatar() {
    const url = `/kanban/analise?card=${card.id}`;
    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Detalhes da Ficha</h2>
            <p className="text-sm text-gray-500">{app.primary_name || card.applicant_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={openResgatar}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Resgatar Ficha
            </Button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Coluna esquerda */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Informações do Cliente</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nome/Razão:</span>
                    <span className="font-medium text-gray-900">{app.primary_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CPF/CNPJ:</span>
                    <span className="font-medium text-gray-900">{app.cpf_cnpj || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-500">Status:</span>
                    <StatusBadge value={card.final_decision} />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Equipe Responsável</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Colaboradores envolvidos no processo desta ficha</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Vendedor</div>
                    <div className="text-sm font-medium text-gray-900">{vendedor.full_name || '—'}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Analista</div>
                    <div className="text-sm font-medium text-gray-900">{analista.full_name || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Coluna direita */}
            <div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Pareceres</h3>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-3">
                  {pareceres.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">Sem pareceres registrados</p>
                    </div>
                  ) : (
                    pareceres.map((p: any) => (
                      <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{p.author_name || '—'}</span>
                          <span className="text-xs text-gray-500">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {p.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  const v = (value || '').toLowerCase();
  if (v === 'aprovados' || v === 'aprovado') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Aprovado
      </span>
    );
  }
  if (v === 'negados' || v === 'negado') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Negado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Indefinido
    </span>
  );
}

async function listProfiles(): Promise<ProfileLite[]> {
  const { data, error } = await supabase.from('profiles').select('id, full_name, role').order('full_name');
  if (error) return [];
  return (data as any) || [];
}

function atStart(d: string) { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.toISOString(); }
function atEnd(d: string) { const dt = new Date(d); dt.setHours(23,59,59,999); return dt.toISOString(); }
