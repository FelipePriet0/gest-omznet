"use client";

import { supabase } from "@/lib/supabaseClient";
import { startOfDayUtcISO, endOfDayUtcISO, localDateTimeToUtcISO, DEFAULT_TIMEZONE } from "@/lib/datetime";

export type AgendaTechnician = { id: string; name: string; active: boolean; activity?: string | null };
export async function fetchAgendaTechnicians(): Promise<AgendaTechnician[]> {
  const { data, error } = await supabase
    .from("technicians")
    .select("id, name, active, activity")
    .is("deleted_at", null)
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map((t: any) => ({ id: t.id, name: t.name || "—", active: !!t.active, activity: t.activity ?? null }));
}

export type AgendaDBCard = {
  id: string;
  applicant_id: string;
  assignee_id: string | null;
  due_at: string | null;
  hora_at: string[] | string | null;
  tipo_instalacao?: string | null;
};

export type AgendaUICard = {
  id: string;
  applicant_id: string;
  date: string; // YYYY-MM-DD
  technician_id: string;
  free_row_id?: string | null;
  time_slot: string; // HH:mm — primeiro slot
  time_slots?: string[]; // todos os slots do card
  cliente: string;
  plano?: string | null;
  bairro?: string | null;
  tipo_instalacao?: string | null;
  area?: string | null;
  stage?: string | null;
};

export async function fetchAgendaCardsByDate(dateISO: string): Promise<AgendaUICard[]> {
  const start = startOfDayUtcISO(dateISO) as string;
  const end = endOfDayUtcISO(dateISO) as string;
  const { data: cards, error } = await supabase
    .from("kanban_cards")
    .select("id, applicant_id, technician_id, free_row_id, due_at, hora_at, tipo_instalacao, area, stage")
    .gte("due_at", start)
    .lte("due_at", end)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const appIds = Array.from(new Set((cards || []).map((c: any) => c.applicant_id).filter(Boolean)));
  const { data: applicants } = await supabase
    .from("applicants")
    .select("id, primary_name, bairro, plano_acesso, sva_avulso")
    .in("id", appIds);
  const apps = new Map<string, any>();
  (applicants || []).forEach((a: any) => apps.set(a.id, a));
  return (cards || []).map((c: any) => {
    const timeArr = Array.isArray(c.hora_at)
      ? (c.hora_at as any[]).map((h) => String(h).slice(0, 5))
      : (c.hora_at ? [String(c.hora_at).slice(0, 5)] : []);
    const time = timeArr[0] || "";
    const app = apps.get(c.applicant_id) || {};
    return {
      id: c.id,
      applicant_id: c.applicant_id,
      date: dateISO,
      technician_id: c.technician_id || "",
      free_row_id: c.free_row_id ?? null,
      time_slot: time,
      time_slots: timeArr,
      cliente: app.primary_name || "",
      plano: app.plano_acesso || null,
      bairro: app.bairro || null,
      sva: app.sva_avulso || null,
      tipo_instalacao: c.tipo_instalacao ?? null,
      area: c.area ?? null,
      stage: c.stage ?? null,
    } as AgendaUICard;
  });
}

/** Busca cards agendados globalmente (sem filtro de data) por nome do cliente */
export async function searchAgendaCardsGlobal(searchTerm: string): Promise<AgendaUICard[]> {
  // Buscar applicants que contêm o termo
  const { data: matchedApps, error: appErr } = await supabase
    .from("applicants")
    .select("id, primary_name, bairro, plano_acesso, sva_avulso")
    .ilike("primary_name", `%${searchTerm}%`)
    .limit(100);
  if (appErr) throw appErr;
  if (!matchedApps || matchedApps.length === 0) return [];

  const appIds = matchedApps.map((a: any) => a.id);
  const apps = new Map<string, any>();
  matchedApps.forEach((a: any) => apps.set(a.id, a));

  // Buscar kanban_cards desses applicants que têm due_at (estão agendados)
  const { data: cards, error } = await supabase
    .from("kanban_cards")
    .select("id, applicant_id, technician_id, free_row_id, due_at, hora_at, tipo_instalacao, area, stage")
    .in("applicant_id", appIds)
    .not("due_at", "is", null)
    .is("deleted_at", null)
    .order("due_at", { ascending: true });
  if (error) throw error;

  return (cards || []).map((c: any) => {
    const timeArr = Array.isArray(c.hora_at)
      ? (c.hora_at as any[]).map((h) => String(h).slice(0, 5))
      : (c.hora_at ? [String(c.hora_at).slice(0, 5)] : []);
    const time = timeArr[0] || "";
    const app = apps.get(c.applicant_id) || {};
    // Extrair data local do due_at
    const dueDate = c.due_at ? c.due_at.slice(0, 10) : "";
    return {
      id: c.id,
      applicant_id: c.applicant_id,
      date: dueDate,
      technician_id: c.technician_id || "",
      free_row_id: c.free_row_id ?? null,
      time_slot: time,
      time_slots: timeArr,
      cliente: app.primary_name || "",
      plano: app.plano_acesso || null,
      bairro: app.bairro || null,
      sva: app.sva_avulso || null,
      tipo_instalacao: c.tipo_instalacao ?? null,
      area: c.area ?? null,
      stage: c.stage ?? null,
    } as AgendaUICard;
  });
}

export async function updateScheduleCard(params: {
  id: string;
  dateISO?: string;
  technician_id?: string | null;
  free_row_id?: string | null;
  time_slot?: string | null;
  time_slots?: string[] | null; // todos os slots (ex: ["08:30","10:30"])
  tipo_instalacao?: string | null;
}) {
  const USE_RPC = process.env.NEXT_PUBLIC_USE_MOVE_SCHEDULE_RPC === 'true';

  // optional meta update
  if (typeof params.tipo_instalacao !== "undefined") {
    const meta = await supabase.rpc('update_schedule_meta', { p_card_id: params.id, p_tipo_instalacao: params.tipo_instalacao });
    if (meta?.error) console.warn('update_schedule_meta falhou; seguindo mesmo assim', meta.error);
  }

  const hasAll = Boolean(params.dateISO) && typeof params.technician_id !== 'undefined' && typeof params.time_slot !== 'undefined';
  const isMultiSlot = params.time_slots && params.time_slots.length > 1;
  const patch: any = {};
  if (params.dateISO) patch.due_at = localDateTimeToUtcISO(params.dateISO, "12:00", DEFAULT_TIMEZONE);
  if (typeof params.technician_id !== "undefined") patch.technician_id = params.technician_id || null;
  if (typeof params.free_row_id    !== "undefined") patch.free_row_id   = params.free_row_id   ?? null;
  if (typeof params.time_slot !== "undefined") {
    // Usar time_slots se fornecido (card span), senão usar time_slot único
    patch.hora_at = isMultiSlot
      ? (params.time_slots as string[]).map((s) => s + ":00")
      : params.time_slot ? [params.time_slot + ":00"] : null;
  }
  // Marca origem manual quando a UI altera técnico/slot
  if (typeof params.technician_id !== 'undefined' || typeof params.time_slot !== 'undefined') {
    patch.assign_origin = 'manual';
  }

  // RPC move_schedule só suporta 1 slot — ignorar quando card é span (2 slots)
  if (hasAll && USE_RPC && !isMultiSlot) {
    const rpc = await supabase.rpc('move_schedule', { p_card_id: params.id, p_date: params.dateISO, p_time_slot: params.time_slot, p_technician_id: params.technician_id });
    if (!rpc?.error) return;
    console.warn('move_schedule indisponível; aplicando fallback update', rpc.error);
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('kanban_cards').update(patch).eq('id', params.id).select('id').limit(1);
    if (error) throw error;
  }
}

export async function validateMove(params: { id: string; dateISO: string; technician_id: string; time_slot: string }) {
  const { id, dateISO, technician_id, time_slot } = params;
  const USE_RPC = process.env.NEXT_PUBLIC_USE_MOVE_SCHEDULE_RPC === 'true';
  if (!USE_RPC) return;
  const { error } = await supabase.rpc('validate_move', { p_card_id: id, p_technician_id: technician_id, p_date: dateISO, p_time_slot: time_slot });
  if (error) throw error;
}

export async function createApplicant(payload: { primary_name: string; bairro?: string | null; person_type?: 'PF' | 'PJ' }) {
  const insert: any = { primary_name: payload.primary_name, person_type: payload.person_type || 'PF' };
  if (typeof payload.bairro !== 'undefined') insert.bairro = payload.bairro;
  const { data, error } = await supabase.from('applicants').insert(insert).select('id').single();
  if (error) throw error;
  return data as { id: string };
}

export async function createScheduleCard(payload: {
  applicant_id: string;
  dateISO: string;
  technician_id: string;
  time_slot: string;
  tipo_instalacao?: string | null;
}) {
  const due_at = localDateTimeToUtcISO(payload.dateISO, '12:00', DEFAULT_TIMEZONE) as string;
  const hora_at = payload.time_slot ? [payload.time_slot + ":00"] : null;

  // Descobrir person_type do applicant
  let person_type: 'PF' | 'PJ' = 'PF';
  try {
    const { data: a } = await supabase.from('applicants').select('person_type').eq('id', payload.applicant_id).single();
    if (a?.person_type === 'PJ') person_type = 'PJ';
  } catch {}

  // Usuário atual para created_by (exigido em alguns schemas)
  let created_by: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    created_by = (data as any)?.user?.id ?? null;
  } catch {}

  const row: any = {
    applicant_id: payload.applicant_id,
    person_type,
    area: 'analise',
    stage: 'em_analise',
    assign_origin: 'manual',
    created_by,
    technician_id: payload.technician_id || null,
    due_at,
    hora_at,
  };
  if (typeof payload.tipo_instalacao !== 'undefined') row.tipo_instalacao = payload.tipo_instalacao;
  const { error } = await supabase.from('kanban_cards').insert(row).select('id').single();
  if (error) throw error;
}


export async function clearScheduleCard(id: string) {
  const { error } = await supabase
    .from("kanban_cards")
    .update({ due_at: null, hora_at: null, assignee_id: null, tipo_instalacao: null })
    .eq("id", id);
  if (error) throw error;
}

// ----------------------------------------------------------------
// RPC: suggest_assignment
// Fonte da verdade para matching automático (back-end).
// Retorna { technician_id, time_slot } ou { null, null } se falhar.
// ----------------------------------------------------------------
export async function suggestAssignmentRPC(
  applicantId: string | null,
  dateISO: string,
  tipoInstalacao?: string | null
): Promise<{ technician_id: string | null; time_slot: string | null }> {
  const { data, error } = await supabase.rpc('suggest_assignment', {
    p_applicant_id: applicantId ?? null,
    p_date: dateISO,
    p_tipo_instalacao: tipoInstalacao ?? null,
  });
  if (error) throw error;
  // A RPC retorna setof record; Supabase JS retorna array
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { technician_id: null, time_slot: null };
  return {
    technician_id: (row as any).technician_id ?? null,
    time_slot: (row as any).time_slot ?? null,
  };
}

// ----------------------------------------------------------------
// RPC: create_schedule_with_matching
// Cria o card no banco já com o matching automático do back-end.
// Retorna o UUID do card criado.
// ----------------------------------------------------------------
export async function createScheduleWithMatching(
  applicantId: string,
  dateISO: string,
  tipoInstalacao?: string | null
): Promise<string> {
  const { data, error } = await supabase.rpc('create_schedule_with_matching', {
    p_applicant_id: applicantId,
    p_date: dateISO,
    p_tipo_instalacao: tipoInstalacao ?? null,
  });
  if (error) throw error;
  return data as string;
}

// ────────────────────────────────────────────────────────────────────────────
// Linhas Livres (agenda_free_rows)
// ────────────────────────────────────────────────────────────────────────────
import type { FreeRow } from "./types";

// Linhas são globais — não filtram por data
export async function fetchFreeRows(): Promise<FreeRow[]> {
  const { data, error } = await supabase
    .from("agenda_free_rows")
    .select("id, display_order")
    .is("deleted_at", null)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    display_order: r.display_order,
  }));
}

export async function addFreeRow(): Promise<FreeRow> {
  const { data, error } = await supabase.rpc("add_free_row");
  if (error) throw error;
  const newId = data as string;
  // Buscar o registro recém-criado para ter o display_order correto
  const { data: row } = await supabase
    .from("agenda_free_rows")
    .select("id, display_order")
    .eq("id", newId)
    .single();
  return { id: newId, display_order: (row as any)?.display_order ?? 0 };
}

export async function deleteFreeRow(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_free_row", { p_id: id });
  if (error) throw error;
}

export async function updateApplicant(applicantId: string, patch: { primary_name?: string; bairro?: string | null }) {
  const payload: any = {};
  if (typeof patch.primary_name !== "undefined") payload.primary_name = patch.primary_name;
  if (typeof patch.bairro !== "undefined") payload.bairro = patch.bairro;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("applicants").update(payload).eq("id", applicantId);
  if (error) throw error;
}
