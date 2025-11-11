"use client";

import { supabase } from "@/lib/supabaseClient";
import { KanbanCard } from "@/features/kanban/types";
import { startOfDayUtcISO, endOfDayUtcISO } from "@/lib/datetime";

export async function changeStage(cardId: string, area: 'comercial' | 'analise', stage: string, reason?: string) {
  // 1) Tenta via RPC centralizado
  const rpc = await supabase.rpc('change_stage', { p_card_id: cardId, p_area: area, p_stage: stage, p_reason: reason ?? null });
  if (!rpc.error) {
    // Atualiza decisão quando for pipeline de análise
    if (area === 'analise') {
      try {
        if (stage === 'aprovados') {
          await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'aprovado' });
        } else if (stage === 'negados') {
          await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'negado' });
        } else if (stage === 'reanalise') {
          await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'reanalise' });
        } else if (stage === 'em_analise' || stage === 'recebidos') {
          await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: null });
        }
      } catch (err) {
        console.warn('set_card_decision failed', err);
      }
    }
    return rpc.data;
  }

  // 2) Fallback: atualiza diretamente a tabela (caso RPC tenha sido removido com triggers)
  const patch: any = { stage, area };
  // Opcional: manter motivo localmente se houver coluna específica (ignorado se não existir)
  try {
    const { data, error } = await supabase.from('kanban_cards').update(patch).eq('id', cardId).select('id').single();
    if (error) throw error;
    // Também tenta sincronizar decisão quando área analise
    if (area === 'analise') {
      try {
        if (stage === 'aprovados') await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'aprovado' });
        else if (stage === 'negados') await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'negado' });
        else if (stage === 'reanalise') await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: 'reanalise' });
        else await supabase.rpc('set_card_decision', { p_card_id: cardId, p_decision: null });
      } catch {}
    }
    return data;
  } catch (e) {
    // Retorna o erro original do RPC se existir, senão o fallback
    throw rpc.error || e;
  }
}

export async function listCards(
  area: 'comercial' | 'analise',
  opts?: { hora?: string; dateStart?: string; dateEnd?: string; responsaveis?: string[] }
): Promise<KanbanCard[]> {
  const baseSelect = 'id, stage, area, applicant_id, due_at, hora_at, applicants:applicants!inner(id, primary_name, cpf_cnpj, phone, whatsapp, bairro)';

  let q = supabase
    .from('kanban_cards')
    .select(baseSelect)
    .eq('area', area)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (opts?.hora) {
    const hhmm = opts.hora.trim();
    const timeVariants = new Set<string>([hhmm]);
    if (hhmm.length === 5) {
      timeVariants.add(`${hhmm}:00`);
      timeVariants.add(`${hhmm}:00+00`);
    }
    const variants = Array.from(timeVariants);
    if (variants.length === 1) {
      q = q.filter('hora_at', 'cs', `{${variants[0]}}`);
    } else {
      const orConditions = variants.map((value) => `hora_at.cs.{${value}}`).join(',');
      q = q.or(orConditions);
    }
  }

  if (opts?.dateStart || opts?.dateEnd) {
    const startIso = opts?.dateStart ? startOfDayUtcISO(opts.dateStart) : undefined;
    // Se não houver fim, usamos o próprio início como fim do dia local
    const endBase = opts?.dateEnd ?? opts?.dateStart;
    const endIso = endBase ? endOfDayUtcISO(endBase) : undefined;

    if (startIso) {
      q = q.gte('due_at', startIso);
    }
    if (endIso) {
      q = q.lte('due_at', endIso);
    }
  }

  if (opts?.responsaveis && opts.responsaveis.length > 0) {
    const responsavelIds = opts.responsaveis
      .map((id) => id?.trim())
      .filter((id): id is string => !!id && id.length > 0);
    if (responsavelIds.length > 0) {
      if (area === 'comercial') {
        q = q.in('created_by', responsavelIds);
      } else {
        q = q.in('assignee_id', responsavelIds);
      }
    }
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const uniqueRows = new Map<string, any>();
  for (const row of rows) {
    if (row?.id && !uniqueRows.has(row.id)) {
      uniqueRows.set(row.id, row);
    }
  }

  return Array.from(uniqueRows.values()).map((row: any) => {
    const hours = Array.isArray(row.hora_at) ? row.hora_at : (row.hora_at ? [row.hora_at] : []);
    const horaLabel = hours.length > 1
      ? hours.map((h: any) => String(h).slice(0, 5)).join(' e ')
      : hours[0]
        ? String(hours[0]).slice(0, 5)
        : undefined;
    return {
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
    } as KanbanCard;
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
