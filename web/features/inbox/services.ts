"use client";

import { supabase } from "@/lib/supabaseClient";

export type NotificationType = 'mention' | 'card_new' | 'card_overdue';

export async function notifyMention(params: { userId: string; cardId: string; commentId: string; authorName?: string | null }) {
  try {
    const title = '💬 Nova menção';
    const body = params.authorName ? `${params.authorName} mencionou você em uma conversa` : 'Você foi mencionado em uma conversa';
    await supabase.from('inbox_notifications').insert({
      user_id: params.userId,
      card_id: params.cardId,
      comment_id: params.commentId,
      type: 'mention',
      title,
      body,
    } as any);
  } catch {}
}

export type InboxItem = {
  id: string;
  user_id: string;
  type: 'comment' | 'card' | 'system' | string;
  priority?: 'low' | 'medium' | 'high' | null;
  title?: string | null;
  body?: string | null;
  content?: string | null;
  meta?: any;
  card_id?: string | null;
  comment_id?: string | null;
  link_url?: string | null;
  transient?: boolean | null;
  expires_at?: string | null;
  read_at?: string | null;
  created_at?: string | null;
  applicant_id?: string | null;
};

export async function listInbox(): Promise<InboxItem[]> {
  const { data, error } = await supabase.rpc('list_inbox_notifications');
  if (error) {
    console.error('Failed to list inbox notifications', error);
    return [];
  }
  return (data as InboxItem[]) ?? [];
}

export async function markRead(id: string) {
  const { error } = await supabase.from('inbox_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

