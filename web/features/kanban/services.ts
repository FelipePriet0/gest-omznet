"use client";

import { supabase } from "@/lib/supabaseClient";
import { KanbanCard } from "@/features/kanban/types";

export async function changeStage(cardId: string, area: 'comercial' | 'analise', stage: string, reason?: string) {
  const { data, error } = await supabase.rpc('change_stage', { p_card_id: cardId, p_area: area, p_stage: stage, p_reason: reason ?? null });
  if (error) throw error;
  if (area === 'analise') {
    try {
      if (stage === 'aprovados') {
        await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'aprovado' });
      } else if (stage === 'negados') {
        await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'negado' });
      } else if (stage === 'reanalise') {
        await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: null });
      }
    } catch (err) {
      console.warn('set_card_decision failed', err);
    }
  }
  return data;
}

export async function listCards(
  area: 'comercial' | 'analise',
  opts?: { hora?: string; prazo?: 'hoje' | 'amanha' | 'atrasado' | 'data'; date?: string }
): Promise<KanbanCard[]> {
  let q = supabase
    .from('kanban_cards')
    .select('id, stage, area, applicant_id, due_at, hora_at, applicants:applicants!inner(id, primary_name, cpf_cnpj, phone, whatsapp, bairro)')
    .eq('area', area)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  // Sem uso de "arquivados"; mantemos apenas deleted_at como filtro

  if (opts?.hora) {
    const hhmm = opts.hora.trim();
    const hhmmss = hhmm.length === 5 ? `${hhmm}:00` : hhmm; // 08:30 -> 08:30:00
    // hora_at agora é time[]; usamos contains
    q = q.contains('hora_at', [hhmmss]);
  }

  // Prazo por due_at
  const now = new Date();
  function isoAt(d: Date, h: number, m=0, s=0) { const x = new Date(d); x.setHours(h, m, s, 0); return x.toISOString(); }
  if (opts?.prazo === 'hoje') {
    const start = isoAt(now, 0,0,0); const end = isoAt(now, 23,59,59);
    q = q.gte('due_at', start).lte('due_at', end);
  } else if (opts?.prazo === 'amanha') {
    const d = new Date(now); d.setDate(d.getDate()+1);
    const start = new Date(d); start.setHours(0,0,0,0);
    const end = new Date(d); end.setHours(23,59,59,0);
    q = q.gte('due_at', start.toISOString()).lte('due_at', end.toISOString());
  } else if (opts?.prazo === 'atrasado') {
    q = q.lt('due_at', now.toISOString());
  } else if (opts?.prazo === 'data' && opts?.date) {
    const [y,m,d] = opts.date.split('-').map(Number);
    if (y && m && d) {
      const day = new Date(Date.UTC(y, m-1, d));
      const start = new Date(day); start.setUTCHours(0,0,0,0);
      const end = new Date(day); end.setUTCHours(23,59,59,0);
      q = q.gte('due_at', start.toISOString()).lte('due_at', end.toISOString());
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const hours = Array.isArray(row.hora_at) ? row.hora_at : (row.hora_at ? [row.hora_at] : []);
    const horaLabel = hours.length > 1
      ? hours.map((h: any) => String(h).slice(0,5)).join(' e ')
      : (hours[0] ? String(hours[0]).slice(0,5) : undefined);
    return ({
    id: row.id,
    applicantId: row.applicant_id,
    applicantName: row.applicants?.primary_name ?? '-',
    cpfCnpj: row.applicants?.cpf_cnpj ?? '-',
    phone: row.applicants?.phone ?? undefined,
    whatsapp: row.applicants?.whatsapp ?? undefined,
    bairro: row.applicants?.bairro ?? undefined,
    dueAt: row.due_at ?? undefined,
    horaAt: horaLabel,
    area: row.area,
    stage: row.stage,
  });
  });
}

export async function listHours(area: 'comercial' | 'analise'): Promise<string[]> {
  const { data, error } = await supabase
    .from('kanban_cards')
    .select('hora_at')
    .eq('area', area)
    .is('deleted_at', null)
    .not('hora_at', 'is', null);
  if (error) return [];
  const set = new Set<string>();
  (data ?? []).forEach((r: any) => {
    const hours = Array.isArray(r?.hora_at) ? r.hora_at : (r?.hora_at ? [r.hora_at] : []);
    hours.forEach((h: any) => {
      const v = (h ?? '').toString().slice(0,5);
      if (v) set.add(v);
    });
  });
  const values = Array.from(set);
  if (values.length === 0) return ['08:30','10:30','13:30','15:30'];
  return values;
}

export type KanbanDashboard = {
  // Comercial
  feitasAguardando: number;
  canceladas: number;
  concluidas: number;
  atrasadas: number;
  // Análise
  recebidos: number;
  emAnalise: number;
  reanalise: number;
  finalizados: number;
  analiseCanceladas: number;
};

async function computeDashboardFromClient(area: 'comercial' | 'analise', nowISO?: string): Promise<KanbanDashboard> {
  const now = nowISO ? new Date(nowISO) : new Date();
  const { data, error } = await supabase
    .from('kanban_cards')
    .select('stage, area, due_at')
    .eq('area', area)
    .is('deleted_at', null);
  if (error || !data) {
    return { feitasAguardando: 0, canceladas: 0, concluidas: 0, atrasadas: 0, recebidos: 0, emAnalise: 0, reanalise: 0, finalizados: 0, analiseCanceladas: 0 };
  }
  const rows = data as any[];
  const lc = (s:string)=> (s||'').toLowerCase();
  const isTodayPast = (d?: string | null) => {
    if (!d) return false;
    try { return new Date(d).getTime() < now.getTime(); } catch { return false; }
  };
  return {
    feitasAguardando: rows.filter(r => ['feitas','aguardando'].includes(lc(r.stage))).length,
    canceladas: rows.filter(r => lc(r.stage) === 'canceladas').length,
    concluidas: rows.filter(r => lc(r.stage) === 'concluidas').length,
    atrasadas: rows.filter(r => ['feitas','aguardando'].includes(lc(r.stage)) && isTodayPast(r.due_at)).length,
    recebidos: rows.filter(r => lc(r.stage) === 'recebidos').length,
    emAnalise: rows.filter(r => lc(r.stage) === 'em_analise').length,
    reanalise: rows.filter(r => lc(r.stage) === 'reanalise').length,
    finalizados: rows.filter(r => lc(r.stage) === 'finalizados').length,
    analiseCanceladas: rows.filter(r => lc(r.stage) === 'canceladas').length,
  };
}

export async function getKanbanDashboard(area: 'comercial' | 'analise', nowISO?: string): Promise<KanbanDashboard> {
  const args: any = { p_area: area };
  if (nowISO) args.p_now = nowISO;
  const { data, error } = await supabase.rpc('dashboard_kanban_counts', args);
  if (error) throw error;
  const row = Array.isArray(data) ? (data[0] as any) : (data as any);
  if (!row) throw new Error('dashboard_kanban_counts retornou vazio');
  return {
    feitasAguardando: Number(row?.feitas_aguardando_count ?? 0),
    canceladas: Number(row?.canceladas_count ?? 0),
    concluidas: Number(row?.concluidas_count ?? 0),
    atrasadas: Number(row?.atrasadas_count ?? 0),
    recebidos: Number(row?.recebidos_count ?? 0),
    emAnalise: Number(row?.em_analise_count ?? 0),
    reanalise: Number(row?.reanalise_count ?? 0),
    finalizados: Number(row?.finalizados_count ?? 0),
    analiseCanceladas: Number(row?.analise_canceladas_count ?? 0),
  };
}
