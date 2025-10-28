"use client";

import { supabase } from "@/lib/supabaseClient";
import { KanbanCard } from "@/features/kanban/types";

export async function changeStage(cardId: string, area: 'comercial' | 'analise', stage: string, reason?: string) {
  const { data, error } = await supabase.rpc('change_stage', { p_card_id: cardId, p_area: area, p_stage: stage, p_reason: reason ?? null });
  if (error) throw error;
  return data;
}

export async function softDeleteCard(cardId: string, reason?: string) {
  const { data, error } = await supabase.rpc('soft_delete_card', { p_card_id: cardId, p_reason: reason ?? null });
  if (error) throw error;
  return data;
}

export async function listCards(
  area: 'comercial' | 'analise',
  opts?: { hora?: string }
): Promise<KanbanCard[]> {
  let q = supabase
    .from('kanban_cards')
    .select('id, stage, area, applicant_id, due_at, hora_at, applicants:applicants!inner(id, primary_name, cpf_cnpj, phone, whatsapp, bairro)')
    .eq('area', area)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (opts?.hora) {
    const hhmm = opts.hora.trim();
    const hhmmss = hhmm.length === 5 ? `${hhmm}:00` : hhmm; // 08:30 -> 08:30:00
    q = q.eq('hora_at', hhmmss);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    applicantId: row.applicant_id,
    applicantName: row.applicants?.primary_name ?? '-',
    cpfCnpj: row.applicants?.cpf_cnpj ?? '-',
    phone: row.applicants?.phone ?? undefined,
    whatsapp: row.applicants?.whatsapp ?? undefined,
    bairro: row.applicants?.bairro ?? undefined,
    dueAt: row.due_at ?? undefined,
    horaAt: row.hora_at ? row.hora_at.toString().slice(0,5) : undefined,
    area: row.area,
    stage: row.stage,
  }));
}

export async function listHours(area: 'comercial' | 'analise'): Promise<string[]> {
  const { data, error } = await supabase
    .from('kanban_cards')
    .select('hora_at', { distinct: true })
    .eq('area', area)
    .is('deleted_at', null)
    .not('hora_at', 'is', null)
    .order('hora_at', { ascending: true });
  if (error) return [];
  const set = new Set<string>();
  (data ?? []).forEach((r: any) => {
    const v = (r?.hora_at ?? '').toString().slice(0,5);
    if (v) set.add(v);
  });
  const values = Array.from(set);
  if (values.length === 0) return ['08:30','10:30','13:30','15:30'];
  return values;
}
