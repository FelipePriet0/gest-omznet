"use client";

import { supabase } from "@/lib/supabaseClient";
import { TABLE_APPLICANTS, TABLE_KANBAN_CARDS } from "@/lib/constants";

export async function setCardDecision(cardId: string, decision: "aprovado" | "negado" | "reanalise" | null) {
  return supabase.rpc("set_card_decision", { p_card_id: cardId, p_decision: decision });
}

export async function addParecer(params: { cardId: string; text: string; parentId?: string | null; decision?: string | null }) {
  const { cardId, text, parentId = null, decision = null } = params;
  return supabase.rpc("add_parecer", { p_card_id: cardId, p_text: text, p_parent_id: parentId, p_decision: decision });
}

export async function editParecer(params: { cardId: string; noteId: string; text: string; decision?: string | null }) {
  const { cardId, noteId, text, decision = null } = params;
  return supabase.rpc("edit_parecer", { p_card_id: cardId, p_note_id: noteId, p_text: text, p_decision: decision });
}

export async function deleteParecer(params: { cardId: string; noteId: string }) {
  const { cardId, noteId } = params;
  return supabase.rpc("delete_parecer", { p_card_id: cardId, p_note_id: noteId });
}

export async function fetchApplicantCard(applicantId: string, cardId: string) {
  const { data: a, error: aErr } = await supabase
    .from(TABLE_APPLICANTS)
    .select(
      "primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, person_type"
    )
    .eq("id", applicantId)
    .single();
  const { data: c, error: cErr } = await supabase
    .from(TABLE_KANBAN_CARDS)
    .select("created_at, due_at, hora_at, reanalysis_notes, created_by, assignee_id")
    .eq("id", cardId)
    .single();
  return { applicant: a, card: c, applicantError: aErr, cardError: cErr } as const;
}

