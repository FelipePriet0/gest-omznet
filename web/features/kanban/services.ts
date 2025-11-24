"use client";

import { supabase } from "@/lib/supabaseClient";
import { TABLE_KANBAN_CARDS } from "@/lib/constants";
import { KanbanCard } from "@/features/kanban/types";
import { startOfDayUtcISO, endOfDayUtcISO } from "@/lib/datetime";

export async function changeStage(
  cardId: string,
  area: 'comercial' | 'analise',
  stage: string,
  reason?: string,
  assigneeId?: string | null
) {
  const USE_RPC = process.env.NEXT_PUBLIC_USE_CHANGE_STAGE_RPC === 'true';
  // 1) Tenta via RPC centralizado (opcional para evitar 400 no console quando desabilitado)
  if (USE_RPC) {
    const rpc = await supabase.rpc('change_stage', { p_card_id: cardId, p_area: area, p_stage: stage, p_reason: reason ?? null });
    if (!rpc.error) {
      await handlePostStageChanges(cardId, area, stage, assigneeId);
      return rpc.data;
    }
  }

  // 2) Fallback: atualiza diretamente a tabela (caso RPC tenha sido removido com triggers)
  const patch: { stage: string; area: 'comercial' | 'analise' } = { stage, area };
  // Opcional: manter motivo localmente se houver coluna específica (ignorado se não existir)
  try {
    // Evita 406 quando nenhuma linha é retornada usando single();
    const { data, error } = await supabase
      .from(TABLE_KANBAN_CARDS)
      .update(patch)
      .eq('id', cardId)
      .select('id')
      .limit(1);
    if (error) throw error;
    await handlePostStageChanges(cardId, area, stage, assigneeId);
    return data;
  } catch (e) {
    // Se RPC estava desativado, propaga somente o erro real do fallback
    if (!USE_RPC) throw e;
    // Retorna o erro original do RPC se existir, senão o fallback
    throw e;
  }
}

function escapeIlikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function listCards(
  area: 'comercial' | 'analise',
  opts?: { hora?: string; dateStart?: string; dateEnd?: string; responsaveis?: string[]; searchTerm?: string }
): Promise<KanbanCard[]> {
  const baseSelect = 'id, stage, area, applicant_id, due_at, hora_at, applicants:applicants!inner(id, primary_name, cpf_cnpj, phone, whatsapp, bairro)';

  let q = supabase
    .from(TABLE_KANBAN_CARDS)
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

  if (opts?.searchTerm) {
    const trimmed = opts.searchTerm.trim();
    if (trimmed.length > 0) {
      const pattern = `%${escapeIlikePattern(trimmed)}%`;
      q = q.ilike('applicants.primary_name', pattern);
    }
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const uniqueRows = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (row?.id && !uniqueRows.has(row.id)) {
      uniqueRows.set(row.id, row as Record<string, unknown>);
    }
  }

  return Array.from(uniqueRows.values()).map((row) => {
    const rawHora = row.hora_at as unknown;
    const hours = Array.isArray(rawHora) ? rawHora : (rawHora ? [rawHora] : []);
    const horaLabel = hours.length > 1
      ? (hours as unknown[]).map((h) => String(h).slice(0, 5)).join(' e ')
      : (hours as unknown[])[0]
        ? String((hours as unknown[])[0]).slice(0, 5)
        : undefined;
    return {
      id: row.id as string,
      applicantId: row.applicant_id as string,
      applicantName: (row.applicants as Record<string, unknown> | undefined)?.primary_name as string ?? '-',
      cpfCnpj: (row.applicants as Record<string, unknown> | undefined)?.cpf_cnpj as string ?? '-',
      phone: (row.applicants as Record<string, unknown> | undefined)?.phone as string | undefined,
      whatsapp: (row.applicants as Record<string, unknown> | undefined)?.whatsapp as string | undefined,
      bairro: (row.applicants as Record<string, unknown> | undefined)?.bairro as string | undefined,
      dueAt: (row.due_at as string) ?? undefined,
      horaAt: horaLabel,
      area: row.area as 'comercial' | 'analise',
      stage: row.stage as string,
    } as KanbanCard;
  });
}

export async function listHours(area: 'comercial' | 'analise'): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLE_KANBAN_CARDS)
    .select('hora_at')
    .eq('area', area)
    .is('deleted_at', null)
    .not('hora_at', 'is', null);
  if (error) return [];
  const set = new Set<string>();
  (data ?? []).forEach((r) => {
    const rr = r as Record<string, unknown>;
    const rawHora = rr?.hora_at as unknown;
    const hours = Array.isArray(rawHora) ? rawHora : (rawHora ? [rawHora] : []);
    (hours as unknown[]).forEach((h) => {
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

export async function getKanbanDashboard(area: 'comercial' | 'analise', nowISO?: string): Promise<KanbanDashboard> {
  const args: { p_area: 'comercial' | 'analise'; p_now?: string } = { p_area: area };
  if (nowISO) args.p_now = nowISO;
  const { data, error } = await supabase.rpc('dashboard_kanban_counts', args);
  if (error) throw error;
  const row = Array.isArray(data) ? (data[0] as Record<string, unknown>) : (data as Record<string, unknown>);
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

async function handlePostStageChanges(
  cardId: string,
  area: 'comercial' | 'analise',
  stage: string,
  assigneeId?: string | null
) {
  if (area !== 'analise') return;
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
    // eslint-disable-next-line no-console -- log necessário para monitorar falhas em produção
    console.warn('set_card_decision failed', err);
  }

  if (stage === 'recebidos') {
    await updateAssignee(cardId, null);
  } else if (stage === 'em_analise' && assigneeId) {
    await updateAssignee(cardId, assigneeId);
  }
}

async function updateAssignee(cardId: string, assigneeId: string | null) {
  try {
    await supabase
      .from(TABLE_KANBAN_CARDS)
      .update({ assignee_id: assigneeId })
      .eq('id', cardId);
  } catch (err) {
    // eslint-disable-next-line no-console -- log necessário para monitorar falhas em produção
    console.warn('updateAssignee failed', err);
  }
}
