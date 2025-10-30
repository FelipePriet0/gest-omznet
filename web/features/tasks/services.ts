"use client";

import { supabase } from "@/lib/supabaseClient";

export type CardTask = {
  id: string;
  card_id: string;
  card_title?: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
  description: string;
  status: 'pending' | 'completed';
  deadline?: string | null;
  comment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  assignee_name?: string | null;
  creator_name?: string | null;
};

export async function listTasks(cardId: string): Promise<CardTask[]> {
  // Use '*' to avoid 400 when some optional columns don't exist in the DB
  const { data, error } = await supabase
    .from("card_tasks")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as any) ?? [];
}

export async function toggleTask(id: string, done: boolean) {
  const { error } = await supabase
    .from("card_tasks")
    .update({ status: done ? 'completed' : 'pending', completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message || "Falha ao atualizar status da tarefa");
}
