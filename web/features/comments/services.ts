"use client";

import { supabase } from "@/lib/supabaseClient";
import { TABLE_CARD_COMMENTS, TABLE_PROFILES } from "@/lib/constants";

export type Comment = {
  id: string;
  card_id: string;
  text: string;
  author_id?: string | null;
  author_name?: string | null;
  author_role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  parent_id?: string | null;
  thread_id?: string | null;
  level?: number | null;
  deleted_at?: string | null;
};

/**
 * LEI 2 - CONTEÚDO: Lista todos os comentários (texto, tarefa, anexo, menção)
 * LEI 3 - ORDEM E UX: Ordena por created_at ASC (cronológico)
 */
export async function listComments(cardId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from(TABLE_CARD_COMMENTS)
    .select("id, card_id, content, author_id, author_name, author_role, created_at, updated_at, parent_id, thread_id, level, deleted_at")
    .eq("card_id", cardId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true }); // LEI 3: Ordem cronológica
  if (error) return [];
  const arr = (data as unknown[]) ?? [];
  return arr.map((r) => {
    const row = r as Record<string, unknown>;
    return {
    id: r.id,
    card_id: row.card_id as string,
    text: row.content as string,
    author_id: (row.author_id as string) ?? null,
    author_name: (row.author_name as string) ?? null,
    author_role: (row.author_role as string) ?? null,
    created_at: (row.created_at as string) ?? null,
    updated_at: (row.updated_at as string) ?? null,
    parent_id: (row.parent_id as string) ?? null,
    thread_id: (row.thread_id as string) ?? null,
    level: (row.level as number) ?? null,
    deleted_at: (row.deleted_at as string) ?? null,
  } as Comment;
  });
}

/**
 * LEI 1 - HIERARQUIA: Valida se parent_id existe e é válido
 * Permite que respostas apontem para Pai e sub-respostas apontem para resposta ou outra sub-resposta
 */
async function validateParentId(cardId: string, parentId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(TABLE_CARD_COMMENTS)
      .select("id, card_id, deleted_at, parent_id")
      .eq("id", parentId)
      .eq("card_id", cardId)
      .is("deleted_at", null)
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
}

export async function addComment(cardId: string, text: string, parentId?: string | null) {
  // LEI 1 - HIERARQUIA: Validar parent_id antes de criar (prevenir órfãos)
  if (parentId) {
    const isValid = await validateParentId(cardId, parentId);
    if (!isValid) {
      throw new Error("Comentário pai não encontrado ou foi deletado. Não é possível criar resposta órfã.");
    }
  }
  
  const payload: {
    card_id: string;
    content: string;
    parent_id?: string | null;
    author_id?: string;
    author_name?: string | null;
    author_role?: string | null;
  } = { card_id: cardId, content: text };
  if (parentId) payload.parent_id = parentId;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (uid) {
      payload.author_id = uid;
      const { data: prof } = await supabase.from('profiles').select('full_name, role').eq('id', uid).single();
      if (prof) { payload.author_name = (prof as { full_name?: string | null }).full_name ?? null; payload.author_role = (prof as { role?: string | null }).role ?? null; }
    }
  } catch {}
  const { data, error } = await supabase.from(TABLE_CARD_COMMENTS).insert(payload).select("id").single();
  if (error) throw new Error(error.message || "Falha ao criar comentário");
  return data?.id as string;
}

export async function editComment(commentId: string, text: string) {
  const { error } = await supabase.from(TABLE_CARD_COMMENTS).update({ content: text }).eq("id", commentId);
  if (error) throw new Error(error.message || "Falha ao editar comentário");
}

export async function deleteComment(commentId: string) {
  // 1) Se existir tarefa(s) vinculada(s) a este comentário criada(s) por mim, excluir também
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id ?? null;
    if (uid) {
      // Exclui apenas tarefas onde eu sou o criador e que apontam para este comentário
      // Assim atendemos o requisito: criador da tarefa apagando a tarefa definitivamente
      await supabase
        .from('card_tasks')
        .delete()
        .eq('comment_id', commentId)
        .eq('created_by', uid);
    }
  } catch {}

  // 2) Excluir comentário (soft ou hard)
  // Soft-delete por deleted_at quando existir
  const { data: colCheck } = await supabase.from(TABLE_CARD_COMMENTS).select("deleted_at").eq("id", commentId).limit(1);
  if (Array.isArray(colCheck) && colCheck.length > 0 && typeof colCheck[0]?.deleted_at !== "undefined") {
    const { error } = await supabase.from(TABLE_CARD_COMMENTS).update({ deleted_at: new Date().toISOString() }).eq("id", commentId);
    if (error) throw new Error(error.message || "Falha ao excluir comentário");
    return;
  }
  const { error } = await supabase.from(TABLE_CARD_COMMENTS).delete().eq("id", commentId);
  if (error) throw new Error(error.message || "Falha ao excluir comentário");
}

export type ProfileLite = { id: string; full_name: string; role?: string | null };
export async function listProfiles(): Promise<ProfileLite[]> {
  const { data, error } = await supabase
    .from(TABLE_PROFILES)
    .select("id, full_name, role")
    .order("full_name", { ascending: true });
  if (error) return [];
  return (data as ProfileLite[]) ?? [];
}
