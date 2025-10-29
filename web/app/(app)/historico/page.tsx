"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DateRangePicker } from "@/features/historico/DateRangePicker";

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
    <div className="space-y-6">
      <section className="rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 px-6 py-5 text-white shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Histórico</h1>
            <p className="text-sm text-white/90">Fichas finalizadas e arquivadas</p>
          </div>
        </div>
      </section>

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

      <List rows={rows} onOpenDetails={openDetails} />

      {detailOpen && detail && (
        <DetailsModal data={detail} onClose={()=> setDetailOpen(false)} />
      )}
    </div>
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

function List({ rows, onOpenDetails }: { rows: Row[]; onOpenDetails: (cardId: string) => void }) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-4 py-2 text-sm font-semibold text-gray-800">Fichas Finalizadas</div>
      <div className="divide-y">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600">Nenhum resultado</div>
        ) : rows.map((r) => (
          <div key={r.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-7 sm:items-center">
            <div className="sm:col-span-2">
              <div className="truncate font-medium text-zinc-800">{r.applicant_name}</div>
              <div className="text-xs text-zinc-500">{r.cpf_cnpj}</div>
            </div>
            <div>
              <StatusBadge value={r.final_decision} />
            </div>
            <div>
              <div className="text-xs text-zinc-500">Vendedor</div>
              <div className="text-sm">{r.vendedor_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Analista</div>
              <div className="text-sm">{r.analista_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Data da decisão</div>
              <div className="text-sm">{r.finalized_at ? new Date(r.finalized_at).toLocaleString() : '—'}</div>
            </div>
            <div className="flex justify-end">
              <button onClick={()=> onOpenDetails(r.id)} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">Ações</button>
            </div>
          </div>
        ))}
      </div>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-xl border bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <div className="text-sm font-semibold text-zinc-800">Detalhes da ficha - {app.primary_name || card.applicant_id}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openResgatar} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">Resgatar Ficha</button>
            <button onClick={onClose} className="rounded border border-zinc-300 px-3 py-1.5 text-sm">X</button>
          </div>
        </header>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded border bg-white p-3">
              <div className="text-sm font-semibold">Informações do Cliente</div>
              <div className="mt-2 text-sm">
                <div><span className="text-zinc-500">Nome/Razão: </span>{app.primary_name || '—'}</div>
                <div><span className="text-zinc-500">CPF/CNPJ: </span>{app.cpf_cnpj || '—'}</div>
                <div className="mt-1"><StatusBadge value={card.final_decision} /></div>
              </div>
            </div>
            <div className="rounded border bg-white p-3">
              <div className="text-sm font-semibold">Equipe Responsável</div>
              <div className="mt-2 text-sm text-zinc-800">
                <div className="text-xs text-zinc-500">Colaboradores envolvidos no processo desta ficha</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-zinc-500">Vendedor</div>
                    <div className="text-sm">{vendedor.full_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Analista</div>
                    <div className="text-sm">{analista.full_name || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded border bg-white p-3">
              <div className="text-sm font-semibold">Pareceres</div>
              <div className="mt-2 max-h-64 overflow-auto space-y-2">
                {pareceres.length === 0 ? (
                  <div className="text-sm text-zinc-600">Sem pareceres registrados</div>
                ) : (
                  pareceres.map((p:any) => (
                    <div key={p.id} className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between text-xs text-zinc-600">
                        <span>{p.author_name || '—'}</span>
                        <span>{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</span>
                      </div>
                      <div className="mt-1 whitespace-pre-line text-zinc-800">{p.text}</div>
                    </div>
                  ))
                )}
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
  if (v === 'aprovados' || v === 'aprovado') return <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">Aprovado</span>;
  if (v === 'negados' || v === 'negado') return <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Negado</span>;
  return <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700">—</span>;
}

async function listProfiles(): Promise<ProfileLite[]> {
  const { data, error } = await supabase.from('profiles').select('id, full_name, role').order('full_name');
  if (error) return [];
  return (data as any) || [];
}

function atStart(d: string) { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.toISOString(); }
function atEnd(d: string) { const dt = new Date(d); dt.setHours(23,59,59,999); return dt.toISOString(); }
