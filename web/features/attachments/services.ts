"use client";

import { supabase } from "@/lib/supabaseClient";

export type CardAttachment = {
  id: string;
  card_id: string;
  comment_id?: string | null;
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
    .from("card_attachments")
    .select("id, card_id, comment_id, file_name, file_path, file_size, file_type, file_extension, description, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as any) ?? [];
}

export async function removeAttachment(id: string) {
  const { error } = await supabase.from("card_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message || "Falha ao excluir anexo");
}

export async function publicUrl(path: string) {
  try {
    // Tenta URL assinada (funciona para bucket privado); fallback para pública
    const signed = await supabase.storage.from("card-attachments").createSignedUrl(path, 60 * 60);
    if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;
    const { data } = supabase.storage.from("card-attachments").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}
