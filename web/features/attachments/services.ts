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
  created_at?: string | null;
};

export async function listAttachments(cardId: string): Promise<CardAttachment[]> {
  const { data, error } = await supabase
    .from(TABLE_CARD_ATTACHMENTS)
    .select("id, card_id, comment_id, author_id, file_name, file_path, file_size, file_type, file_extension, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as any) ?? [];
}

export async function removeAttachment(id: string) {
  const { error } = await supabase.from(TABLE_CARD_ATTACHMENTS).delete().eq("id", id);
  if (error) throw new Error(error.message || "Falha ao excluir anexo");
}

/**
 * Gera URL assinada temporária para acesso seguro a anexos
 * Verifica RLS automaticamente ao buscar o attachment pelo ID
 * @param attachmentId - ID do attachment na tabela card_attachments
 * @param purpose - 'preview' ou 'download' (atualmente ambos usam 1 hora de expiração)
 * @returns URL assinada temporária válida por 1 hora, ou null se erro/não autorizado
 */
export async function getAttachmentUrl(
  attachmentId: string,
  purpose: 'preview' | 'download' = 'preview'
): Promise<string | null> {
  try {
    // 1. Busca o attachment pelo ID (RLS verifica automaticamente se usuário tem acesso)
    const { data: attachment, error: fetchError } = await supabase
      .from(TABLE_CARD_ATTACHMENTS)
      .select("file_path")
      .eq("id", attachmentId)
      .single();

    if (fetchError || !attachment?.file_path) {
      console.error('Erro ao buscar anexo ou anexo não encontrado:', fetchError);
      return null;
    }

    // 2. Gera URL assinada temporária (1 hora = 3600 segundos)
    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET_CARD_ATTACHMENTS)
      .createSignedUrl(attachment.file_path, 3600);

    if (signError) {
      console.error('Erro ao gerar URL assinada:', signError);
      return null;
    }

    return signedData?.signedUrl || null;
  } catch (err) {
    console.error('Erro ao gerar URL do anexo:', err);
    return null;
  }
}

/**
 * @deprecated Use getAttachmentUrl() para URLs seguras assinadas
 * Mantido apenas para compatibilidade com código legado
 */
export async function publicUrl(path: string) {
  try {
    // Preferir URL pública para evitar 400 no endpoint de assinatura em ambientes onde sign não é permitido
    const { data } = supabase.storage.from(STORAGE_BUCKET_CARD_ATTACHMENTS).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}
