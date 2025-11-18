import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Heurística leve para saber se as ENV estão razoavelmente configuradas
export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) && /https?:\/\/[a-z0-9-]+\.supabase\.co/.test(supabaseUrl);

// Wrap de fetch para evitar "TypeError: Failed to fetch" espamar no console em DNS/offline.
const safeFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input as any, init as any);
  } catch (err) {
    // Retorna uma resposta 503 sintética para o SDK lidar sem estourar TypeError no console
    const body = JSON.stringify({ error: "unreachable", message: "Supabase endpoint unreachable" });
    return new Response(body, { status: 503, headers: { "content-type": "application/json" } }) as any;
  }
};

export const supabase = createClient(supabaseUrl || "http://localhost", supabaseAnonKey || "anon", {
  auth: {
    // Se não estiver configurado, não tentar persistir/auto-refresh para não gerar logs
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: true,
  },
  global: {
    fetch: safeFetch,
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
