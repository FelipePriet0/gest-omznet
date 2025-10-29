"use client";

import { supabase } from "@/lib/supabaseClient";

export type NotificationType = 'mention' | 'task_assigned' | 'task_due' | 'card_new' | 'card_overdue';

export async function notifyTaskAssigned(params: { userId: string; cardId: string; taskId: string; description: string; deadline?: string | null }) {
  try {
    const title = '📋 Nova tarefa atribuída';
    const body = params.deadline
      ? `Você tem uma tarefa agendada: ${params.description}`
      : `Você recebeu uma nova tarefa: ${params.description}`;
    await supabase.from('inbox_notifications').insert({
      user_id: params.userId,
      card_id: params.cardId,
      task_id: params.taskId,
      type: 'task_assigned',
      title,
      body,
      meta: { deadline: params.deadline ?? null },
    } as any);
  } catch {}
}

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
  type: 'task'|'comment'|'card'|'system';
  priority?: 'low'|'medium'|'high'|null;
  title?: string|null;
  body?: string|null;
  meta?: any;
  task_id?: string|null;
  card_id?: string|null;
  comment_id?: string|null;
  link_url?: string|null;
  transient?: boolean|null;
  expires_at?: string|null;
  read_at?: string|null;
  created_at?: string|null;
};

export async function listInbox(): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from('inbox_notifications')
    .select('id, user_id, type, priority, title, body, meta, task_id, card_id, comment_id, link_url, transient, expires_at, read_at, created_at')
    .order('created_at', { ascending: false });
  if (error) return [];
  const nowIso = new Date().toISOString();
  return (data as any[]).filter(n => !n.expires_at || n.expires_at > nowIso);
}

export async function markRead(id: string) {
  const { error } = await supabase.from('inbox_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

