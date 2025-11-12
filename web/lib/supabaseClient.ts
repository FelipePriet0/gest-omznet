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

export function clearAllSupabaseSessions() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        keys.push(k);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export async function hardResetAuth() {
  try {
    await supabase.auth.signOut();
  } catch {}
  try {
    clearAllSupabaseSessions();
    sessionStorage.clear();
  } catch {}
}
