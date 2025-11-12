"use client";

import { supabase } from "@/lib/supabaseClient";
import { STORAGE_BUCKET_CARD_ATTACHMENTS, TABLE_CARD_ATTACHMENTS } from "@/lib/constants";

export const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const ATTACHMENT_ALLOWED_TYPES = [
  // imagens
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  // documentos
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-zip-compressed",
];

function slugify(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_. ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export async function uploadAttachmentBatch({
  cardId,
  commentId,
  files,
  description,
}: {
  cardId: string;
  commentId?: string | null;
  files: Array<{ file: File; displayName?: string }>;
  description?: string | null;
}): Promise<Array<{ name: string; path: string }>> {
  if (!cardId) throw new Error("cardId é obrigatório para anexar arquivos.");
  if (!files || files.length === 0) return [];

  const uploaded: Array<{ name: string; path: string }> = [];

  for (const item of files) {
    const { file, displayName } = item;
    const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
    const clean = slugify(displayName || file.name);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${cardId}/${clean}_${ts}.${ext ?? "bin"}`;

    const { error: uploadError } = await supabase
      .storage
      .from(STORAGE_BUCKET_CARD_ATTACHMENTS)
      .upload(path, file, { upsert: false });

    if (uploadError) {
      // Falha ao subir para o Storage (provável RLS/política do bucket)
      const msg = uploadError.message || "Falha ao enviar arquivo ao Storage";
      throw new Error(msg.includes("row-level security") ? "Sem permissão para enviar anexos (políticas do Storage)." : msg);
    }

    const { error: metaError } = await supabase
      .from(TABLE_CARD_ATTACHMENTS)
      .insert({
        card_id: cardId,
        comment_id: commentId ?? null,
        file_name: displayName || file.name,
        description: description ?? null,
        file_path: path,
        file_size: file.size,
        file_type: file.type || null,
        file_extension: ext || null,
      });

    if (metaError) {
      // Reverte o arquivo órfão no Storage para evitar lixo se metadados falharem (ex.: RLS da tabela)
      try { await supabase.storage.from(STORAGE_BUCKET_CARD_ATTACHMENTS).remove([path]); } catch {}
      const msg = metaError.message || "Falha ao salvar metadados do anexo";
      throw new Error(msg.includes("row-level security") ? "Sem permissão para salvar metadados do anexo (RLS)." : msg);
    }

    uploaded.push({ name: displayName || file.name, path });
  }

  return uploaded;
}

// Também exporta como default para facilitar import namespace em alguns bundlers
export default {
  ATTACHMENT_MAX_SIZE,
  ATTACHMENT_ALLOWED_TYPES,
  uploadAttachmentBatch,
};
