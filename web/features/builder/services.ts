"use client";

import { supabase } from "@/lib/supabaseClient";

export type BuilderWorkflow = {
  id: string;
  name: string;
  owner_id: string;
  state: any;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export async function listWorkflows(): Promise<BuilderWorkflow[]> {
  const { data, error } = await supabase.rpc("list_builder_workflows");
  if (error) throw error;
  return (data as any) || [];
}

export async function getWorkflow(id: string): Promise<BuilderWorkflow | null> {
  const { data, error } = await supabase.rpc("get_builder_workflow", { p_id: id });
  if (error) throw error;
  return (data as any) ?? null;
}

export async function saveWorkflow(args: { id?: string | null; name?: string; state: any }): Promise<BuilderWorkflow> {
  const { id = null, name = undefined, state } = args;
  const { data, error } = await supabase.rpc("save_builder_workflow", { p_id: id, p_name: name ?? null, p_state: state });
  if (error) throw error;
  return data as any as BuilderWorkflow;
}

export async function publishWorkflow(id: string, publish = true): Promise<BuilderWorkflow> {
  const { data, error } = await supabase.rpc("publish_builder_workflow", { p_id: id, p_publish: publish });
  if (error) throw error;
  return data as any as BuilderWorkflow;
}

export async function duplicateWorkflow(id: string): Promise<string> {
  const { data, error } = await supabase.rpc("duplicate_builder_workflow", { p_id: id });
  if (error) throw error;
  return (data as any) as string;
}

export async function getLatestPublishedWorkflow(): Promise<BuilderWorkflow | null> {
  // Fallback to direct table query if RPC not available
  const { data, error } = await supabase
    .from("builder_workflows")
    .select("id, name, owner_id, state, published_at, created_at, updated_at, deleted_at")
    .is("deleted_at", null)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? null;
}

export type TechnicianLite = { id: string; name: string };
export async function listTechnicians(): Promise<TechnicianLite[]> {
  const { data, error } = await supabase
    .from("technicians")
    .select("id, name, active, deleted_at")
    .eq("active", true)
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return (data || []).map((t: any) => ({ id: t.id, name: t.name || "—" }));
}

export type Route = { id: string; name: string; active: boolean };
export async function listRoutes(): Promise<Route[]> {
  const { data, error } = await supabase.from("routes").select("id, name, active").order("name");
  if (error) throw error;
  return (data || []) as any;
}

export type Priority = { id: string; label: string; rank: number; active: boolean };
export async function listPriorities(): Promise<Priority[]> {
  const { data, error } = await supabase.from("priorities").select("id, label, rank, active").order("rank");
  if (error) throw error;
  return (data || []) as any;
}
