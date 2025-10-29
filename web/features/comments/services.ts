"use client";

import { supabase } from "@/lib/supabaseClient";

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

export async function listComments(cardId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("card_comments")
    .select("id, card_id, content, author_id, author_name, author_role, created_at, updated_at, parent_id, thread_id, level, deleted_at")
    .eq("card_id", cardId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) return [];
  const arr = (data as any) ?? [];
  return arr.map((r: any) => ({
    id: r.id,
    card_id: r.card_id,
    text: r.content,
    author_id: r.author_id,
    author_name: r.author_name,
    author_role: r.author_role,
    created_at: r.created_at,
    updated_at: r.updated_at,
    parent_id: r.parent_id,
    thread_id: r.thread_id,
    level: r.level,
    deleted_at: r.deleted_at,
  } as Comment));
}

export async function addComment(cardId: string, text: string, parentId?: string | null) {
  const payload: any = { card_id: cardId, content: text };
  if (parentId) payload.parent_id = parentId;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (uid) {
      payload.author_id = uid;
      const { data: prof } = await supabase.from('profiles').select('full_name, role').eq('id', uid).single();
      if (prof) { payload.author_name = (prof as any).full_name ?? null; payload.author_role = (prof as any).role ?? null; }
    }
  } catch {}
  const { data, error } = await supabase.from("card_comments").insert(payload).select("id").single();
  if (error) throw new Error(error.message || "Falha ao criar comentário");
  return data?.id as string;
}

export async function editComment(commentId: string, text: string) {
  const { error } = await supabase.from("card_comments").update({ content: text }).eq("id", commentId);
  if (error) throw new Error(error.message || "Falha ao editar comentário");
}

export async function deleteComment(commentId: string) {
  // Soft-delete por deleted_at quando existir
  const { data: colCheck } = await supabase.from("card_comments").select("deleted_at").eq("id", commentId).limit(1);
  if (Array.isArray(colCheck) && colCheck.length > 0 && typeof colCheck[0]?.deleted_at !== "undefined") {
    const { error } = await supabase.from("card_comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId);
    if (error) throw new Error(error.message || "Falha ao excluir comentário");
    return;
  }
  const { error } = await supabase.from("card_comments").delete().eq("id", commentId);
  if (error) throw new Error(error.message || "Falha ao excluir comentário");
}

export type ProfileLite = { id: string; full_name: string; role?: string | null };
export async function listProfiles(): Promise<ProfileLite[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name", { ascending: true });
  if (error) return [];
  return (data as any) ?? [];
}
