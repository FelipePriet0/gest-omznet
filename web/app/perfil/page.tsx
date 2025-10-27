"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ProfileCard, type ProfileView } from "@/features/perfil/components/ProfileCard";

export default function PerfilPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("full_name, role, created_at")
        .eq("id", data.user.id)
        .single();
      if (profErr) {
        console.error(profErr);
      }
      setProfile({
        full_name: prof?.full_name ?? null,
        role: prof?.role ?? null,
        created_at: prof?.created_at ?? null,
        email: data.user.email ?? null,
      });
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Perfil</h1>
        <button onClick={onLogout} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
          Sair da conta
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Carregando…</div>
      ) : profile ? (
        <>
          <ProfileCard profile={profile} />
          {email && <div className="text-xs text-zinc-500">Logado como: {email}</div>}
        </>
      ) : (
        <div className="text-sm text-red-600">Não foi possível carregar o perfil.</div>
      )}
    </div>
  );
}
