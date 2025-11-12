"use client";

import { supabase } from "@/lib/supabaseClient";
import { STORAGE_BUCKET_CARD_ATTACHMENTS, TABLE_CARD_ATTACHMENTS } from "@/lib/constants";

export type CardAttachment = {
  id: string;
  card_id: string;
  comment_id?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  author_role?: string | null;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
  file_extension?: string | null;
  description?: string | null;
  created_at?: string | null;
};

export async function listAttachments(cardId: string): Promise<CardAttachment[]> {
  const { data, error } = await supabase
    .from(TABLE_CARD_ATTACHMENTS)
    .select("id, card_id, comment_id, author_id, author_name, author_role, file_name, file_path, file_size, file_type, file_extension, description, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as any) ?? [];
}

export async function removeAttachment(id: string) {
  const { error } = await supabase.from(TABLE_CARD_ATTACHMENTS).delete().eq("id", id);
  if (error) throw new Error(error.message || "Falha ao excluir anexo");
}

export async function publicUrl(path: string) {
  try {
    // Preferir URL pública para evitar 400 no endpoint de assinatura em ambientes onde sign não é permitido
    const { data } = supabase.storage.from(STORAGE_BUCKET_CARD_ATTACHMENTS).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}
