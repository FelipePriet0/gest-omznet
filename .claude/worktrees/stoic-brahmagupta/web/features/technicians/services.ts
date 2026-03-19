"use client";

import { supabase } from "@/lib/supabaseClient";

export type TechnicianRow = {
  id: string;
  name: string;
  activity?: string | null;
  available_start?: string | null;
  available_end?: string | null;
  active: boolean;
};

export async function listTechnicians(activeOnly = true): Promise<TechnicianRow[]> {
  const { data, error } = await supabase.rpc("list_technicians", { p_active_only: activeOnly });
  if (error) throw error;
  return (data || []) as TechnicianRow[];
}

export async function createTechnician(params: { name: string; activity?: string; start?: string | null; end?: string | null }) {
  const { name, activity = null, start = null, end = null } = params;
  const { data, error } = await supabase.rpc("create_technician", { p_name: name, p_activity: activity, p_start: start, p_end: end });
  if (error) throw error;
  return data as TechnicianRow;
}

export async function toggleTechnicianActive(id: string, active: boolean): Promise<TechnicianRow> {
  const { data, error } = await supabase.rpc("toggle_technician_active", { p_id: id, p_active: active });
  if (error) throw error;
  return data as TechnicianRow;
}

export async function deleteTechnician(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_technician", { p_id: id });
  if (error) throw error;
}

export async function updateTechnicianInfo(params: {
  id: string;
  name: string;
  activity?: string | null;
  start?: string | null;
  end?: string | null;
}): Promise<TechnicianRow> {
  const { id, name, activity = null, start = null, end = null } = params;
  const { data, error } = await supabase.rpc("update_technician_info", {
    p_id: id,
    p_name: name,
    p_activity: activity,
    p_start: start ?? null,
    p_end: end ?? null,
  });
  if (error) throw error;
  return data as TechnicianRow;
}

