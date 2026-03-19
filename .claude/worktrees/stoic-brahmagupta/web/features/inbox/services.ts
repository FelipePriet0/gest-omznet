"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
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
  meta?: any;
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
    } as any);
  } catch {}
}

// Mantido para compatibilidade de importações
export type { InboxItem, NotificationType };

export async function listInbox(): Promise<InboxItem[]> {
  // Evita poluir console quando sem configuração ou offline
  if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return [];
  }
  try {
    const { data, error } = await supabase.rpc('list_inbox_notifications');
    if (error) throw error;
    return (data as InboxItem[]) ?? [];
  } catch (err: any) {
    console.warn('[inbox] Falha ao carregar notificações:', err?.message || err);
    return [];
  }
}

export async function listMyMentionCardIds(): Promise<string[]> {
  if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return [];
  }
  try {
    const { data, error } = await supabase.rpc('list_my_mention_cards');
    if (error) throw error;
    return (data as string[]) ?? [];
  } catch (err: any) {
    console.warn('[inbox] Falha ao listar cards com menções:', err?.message || err);
    return [];
  }
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
  meta?: any;
};

export async function notifyParecerReply(params: BaseNotifyParams & { cardId: string; noteId?: string }) {
  try {
    const title = '💬 Respondeu seu parecer';
    const body = params.authorName ? `${params.authorName} respondeu seu parecer` : 'Responderam seu parecer';
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
    } as any);
  } catch {}
}

export async function notifyCommentReply(params: BaseNotifyParams & { cardId: string; commentId: string }) {
  try {
    const title = '💬 Respondeu seu comentário';
    const body = params.authorName ? `${params.authorName} respondeu seu comentário` : 'Responderam seu comentário';
    const meta = {
      author_name: params.authorName ?? null,
      primary_name: params.applicantName ?? null,
      applicant_name: params.applicantName ?? null,
      content_preview: params.contentPreview ?? null,
      is_comment_reply: true,
      ...(params.meta ?? {}),
    };
    await supabase.from(TABLE_INBOX_NOTIFICATIONS).insert({
      user_id: params.userId,
      type: 'comment_reply',
      card_id: params.cardId,
      comment_id: params.commentId,
      link_url: params.linkUrl ?? null,
    } as any);
  } catch {}
}

export async function notifyAssApp(params: BaseNotifyParams & { title?: string | null; body?: string | null }) {
  try {
    const defaultTitle = 'Ass App';
    const title = params.title ?? defaultTitle;
    const body = params.body ?? (params.authorName ? `${params.authorName} gerou um evento Ass App` : 'Novo evento Ass App');
    const meta = {
      author_name: params.authorName ?? null,
      primary_name: params.applicantName ?? null,
      applicant_name: params.applicantName ?? null,
      content_preview: params.contentPreview ?? null,
      ...(params.meta ?? {}),
    };
    await supabase.from(TABLE_INBOX_NOTIFICATIONS).insert({
      user_id: params.userId,
      type: 'ass_app',
      card_id: params.cardId ?? null,
      comment_id: params.commentId ?? null,
      link_url: params.linkUrl ?? null,
    } as any);
  } catch {}
}
