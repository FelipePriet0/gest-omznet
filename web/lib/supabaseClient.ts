import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function clearStaleSupabaseSession() {
  try {
    const host = new URL(supabaseUrl).hostname; // <ref>.supabase.co
    const ref = host.split(".")[0];
    const key = `sb-${ref}-auth-token`;
    localStorage.removeItem(key);
  } catch {}
}
