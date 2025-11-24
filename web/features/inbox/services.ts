"use client";

import { supabase } from "@/lib/supabaseClient";
import { TABLE_INBOX_NOTIFICATIONS } from "@/lib/constants";

import type { InboxItem, NotificationType } from "./types";

export async function notifyMention(params: {
  userId: string;
  cardId: string;
  commentId?: string; // quando menção veio de um comentário
  noteId?: string; // quando menção veio de um parecer (kanban_cards.reanalysis_notes[].id)
  authorName?: string | null;
  applicantName?: string | null;
  contentPreview?: string | null;
  linkUrl?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  try {
    const title = '💬 Nova menção';
    const body = params.authorName ? `${params.authorName} mencionou você em uma conversa` : 'Você foi mencionado em uma conversa';
    const meta = {
      author_name: params.authorName ?? null,
      primary_name: params.applicantName ?? null,
      applicant_name: params.applicantName ?? null,
      content_preview: params.contentPreview ?? null,
      ...(params.noteId ? { note_id: params.noteId } : {}),
      ...(params.meta ?? {}),
    };
    await supabase.from(TABLE_INBOX_NOTIFICATIONS).insert({
      user_id: params.userId,
      card_id: params.cardId,
      comment_id: params.commentId ?? null,
      type: 'mention',
      title,
      body,
      link_url: params.linkUrl ?? null,
      meta,
    });
  } catch {}
}

// Mantido para compatibilidade de importações
export type { InboxItem, NotificationType };

export async function listInbox(): Promise<InboxItem[]> {
  const { data, error } = await supabase.rpc('list_inbox_notifications');
  if (error) {
    // eslint-disable-next-line no-console -- log necessário para monitorar falhas em produção
    console.error('Failed to list inbox notifications', error);
    return [];
  }
  return (data as InboxItem[]) ?? [];
}

export async function listMyMentionCardIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc('list_my_mention_cards');
  if (error) {
    // eslint-disable-next-line no-console -- log necessário para monitorar falhas em produção
    console.error('Failed to list mention cards', error);
    return [];
  }
  return (data as string[]) ?? [];
}

export async function markRead(id: string) {
  const { error } = await supabase.from(TABLE_INBOX_NOTIFICATIONS).update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// Helpers para gerar notificações padronizadas

type BaseNotifyParams = {
  userId: string;
  authorName?: string | null;
  applicantName?: string | null; // public.applicant.primary_name
  linkUrl?: string | null;
  contentPreview?: string | null;
  cardId?: string | null;
  commentId?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function notifyParecerReply(params: BaseNotifyParams & { cardId: string; noteId?: string }) {
  try {
    const meta = {
      author_name: params.authorName ?? null,
      primary_name: params.applicantName ?? null,
      applicant_name: params.applicantName ?? null,
      content_preview: params.contentPreview ?? null,
      is_parecer_reply: true,
      ...(params.noteId ? { note_id: params.noteId } : {}),
      ...(params.meta ?? {}),
    };
    await supabase.from(TABLE_INBOX_NOTIFICATIONS).insert({
      user_id: params.userId,
      type: 'parecer_reply',
      card_id: params.cardId,
      link_url: params.linkUrl ?? null,
      meta,
    });
  } catch {}
}

export async function notifyCommentReply(params: BaseNotifyParams & { cardId: string; commentId: string }) {
  try {
    await supabase.from(TABLE_INBOX_NOTIFICATIONS).insert({
      user_id: params.userId,
      type: 'comment_reply',
      card_id: params.cardId,
      comment_id: params.commentId,
      link_url: params.linkUrl ?? null,
    });
  } catch {}
}

export async function notifyAssApp(params: BaseNotifyParams & { title?: string | null; body?: string | null }) {
  try {
    await supabase.from(TABLE_INBOX_NOTIFICATIONS).insert({
      user_id: params.userId,
      type: 'ass_app',
      card_id: params.cardId ?? null,
      comment_id: params.commentId ?? null,
      link_url: params.linkUrl ?? null,
    });
  } catch {}
}
