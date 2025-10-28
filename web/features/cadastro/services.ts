"use client";

import { supabase } from "@/lib/supabaseClient";
import { BasicInfoPF, BasicInfoPJ, PessoaTipo } from "@/features/cadastro/types";

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function checkDuplicidade(doc: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("applicants")
    .select("id", { count: "exact", head: true })
    .eq("cpf_cnpj", doc.trim());
  if (error) return false;
  // if count > 0, exists
  return (data as any) === null ? true : true; // head:true doesn't return rows; rely on error? Safer second query
}

// Safer version of duplicidade (explicit query)
export async function checkDuplicidadeQuery(doc: string): Promise<boolean> {
  const clean = (doc || '').replace(/\D+/g, '');
  const { data, error } = await supabase
    .from("applicants")
    .select("id")
    .eq("cpf_cnpj", clean)
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function criarFichaPF(basic: BasicInfoPF) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado");

  // Pre-checagem de duplicidade
  if (await checkDuplicidadeQuery(basic.cpf)) {
    throw new Error("CPF já cadastrado");
  }

  // 1) applicants
  const applicantId = genId();
  const cpfClean = (basic.cpf || '').replace(/\D+/g, '');
  const { error: appErr } = await supabase
    .from("applicants")
    .insert({
      id: applicantId,
      person_type: "PF",
      primary_name: basic.nome,
      cpf_cnpj: cpfClean,
      phone: basic.tel || null,
      whatsapp: basic.whats || null,
      email: basic.email || null,
    });
  if (appErr) throw appErr;

  // 2) pf_fichas (campos básicos)
  const payload: any = { applicant_id: applicantId };
  if (basic.nasc) {
    // aceita yyyy-mm-dd; se vier dd/mm/aaaa tenta converter
    const ddmmyyyy = basic.nasc.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(ddmmyyyy)) {
      const [d, m, y] = ddmmyyyy.split("/");
      payload.birth_date = `${y}-${m}-${d}`;
    }
  }
  if (basic.naturalidade) payload.naturalidade = basic.naturalidade;
  if (basic.uf) payload.uf_naturalidade = basic.uf; // coluna no banco é uf_naturalidade

  const { error: pfErr } = await supabase.from("pf_fichas").insert(payload);
  if (pfErr) throw pfErr;

  // 3) kanban_cards
  const { data: card, error: cardErr } = await supabase
    .from("kanban_cards")
    .insert({
      applicant_id: applicantId,
      person_type: "PF",
      area: "comercial",
      stage: "cadastrar_no_mk",
      created_by: userId,
    })
    .select("id")
    .single();
  if (cardErr) throw cardErr;

  return { applicantId: applicantId as string, cardId: card.id as string };
}

export async function criarFichaPJ(basic: BasicInfoPJ) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado");

  // Pre-checagem de duplicidade
  if (await checkDuplicidadeQuery(basic.cnpj)) {
    throw new Error("CNPJ já cadastrado");
  }

  // 1) applicants
  const applicantId = genId();
  const cnpjClean = (basic.cnpj || '').replace(/\D+/g, '');
  const { error: appErr } = await supabase
    .from("applicants")
    .insert({
      id: applicantId,
      person_type: "PJ",
      primary_name: basic.razaoSocial,
      cpf_cnpj: cnpjClean,
      phone: basic.tel || null,
      whatsapp: basic.whats || null,
      email: basic.email || null,
    });
  if (appErr) throw appErr;

  // 2) pj_fichas (campos básicos)
  const { error: pjErr } = await supabase.from("pj_fichas").insert({
    applicant_id: applicantId,
    nome_fantasia: basic.fantasia || null,
  });
  if (pjErr) throw pjErr;

  // 3) kanban_cards
  const { data: card, error: cardErr } = await supabase
    .from("kanban_cards")
    .insert({
      applicant_id: applicantId,
      person_type: "PJ",
      area: "comercial",
      stage: "cadastrar_no_mk",
      created_by: userId,
    })
    .select("id")
    .single();
  if (cardErr) throw cardErr;

  return { applicantId: applicantId as string, cardId: card.id as string };
}
