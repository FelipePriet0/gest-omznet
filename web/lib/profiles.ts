"use client";

import { TABLE_PROFILES } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";

export type ProfileLite = {
  id: string;
  full_name: string;
  role?: string | null;
};

export async function listProfiles(): Promise<ProfileLite[]> {
  const { data, error } = await supabase
    .from(TABLE_PROFILES)
    .select("id, full_name, role")
    .order("full_name", { ascending: true });

  if (error) return [];
  return (data as ProfileLite[]) ?? [];
}
