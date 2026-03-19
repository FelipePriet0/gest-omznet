"use client";

import { supabase } from "@/lib/supabaseClient";
import { BasicInfoPF, BasicInfoPJ, PessoaTipo } from "@/features/cadastro/types";

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

// Checagem de duplicidade usada antes de abrir o modal de envio
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

export async function criarFichaPF(basic: BasicInfoPF) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado");

  // Normalizar CPF
  const cpfClean = (basic.cpf || '').replace(/\D+/g, '');

  // Normalizar data de nascimento: dd/mm/yyyy → yyyy-mm-dd
  let birthDate: string | null = null;
  if (basic.nasc) {
    const raw = basic.nasc.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split("/");
      birthDate = `${y}-${m}-${d}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      birthDate = raw;
    }
  }

  // Uma única chamada atômica — se qualquer etapa falhar no banco,
  // toda a transação é revertida (nenhum dado fica "preso" no banco).
  const { data, error } = await supabase.rpc('criar_ficha_pf_atomic', {
    p_user_id:         userId,
    p_primary_name:    basic.nome,
    p_cpf_cnpj:        cpfClean,
    p_phone:           basic.tel    || null,
    p_whatsapp:        basic.whats  || null,
    p_email:           basic.email  || null,
    p_birth_date:      birthDate,
    p_naturalidade:    basic.naturalidade || null,
    p_uf_naturalidade: basic.uf          || null,
  });

  if (error) {
    // Mensagem legível para CPF duplicado
    if (error.message?.includes('CPF já cadastrado')) throw new Error('CPF já cadastrado');
    throw error;
  }

  return {
    applicantId: (data as any).applicant_id as string,
    cardId:      (data as any).card_id      as string,
  };
}

export async function criarFichaPJ(basic: BasicInfoPJ) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado");

  // Normalizar CNPJ
  const cnpjClean = (basic.cnpj || '').replace(/\D+/g, '');

  // Uma única chamada atômica — se qualquer etapa falhar no banco,
  // toda a transação é revertida (nenhum dado fica "preso" no banco).
  const { data, error } = await supabase.rpc('criar_ficha_pj_atomic', {
    p_user_id:       userId,
    p_primary_name:  basic.razaoSocial,
    p_cpf_cnpj:      cnpjClean,
    p_phone:         basic.tel      || null,
    p_whatsapp:      basic.whats    || null,
    p_email:         basic.email    || null,
    p_nome_fantasia: basic.fantasia || null,
  });

  if (error) {
    // Mensagem legível para CNPJ duplicado
    if (error.message?.includes('CNPJ já cadastrado')) throw new Error('CNPJ já cadastrado');
    throw error;
  }

  return {
    applicantId: (data as any).applicant_id as string,
    cardId:      (data as any).card_id      as string,
  };
}
