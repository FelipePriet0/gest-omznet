"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ProfileCard, type ProfileView } from "@/features/perfil/components/ProfileCard";
import { ProfileForm } from "@/features/perfil/components/ProfileForm";

export default function PerfilPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
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
      setUserId(data.user.id);
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

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("profiles-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const r: any = payload.new;
          setProfile((prev) => ({
            full_name: r.full_name ?? prev?.full_name ?? null,
            role: r.role ?? prev?.role ?? null,
            created_at: r.created_at ?? prev?.created_at ?? null,
            email: prev?.email ?? email ?? null,
          }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, email]);

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const initial = (profile?.full_name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="bg-[#ECF4FA] -mx-4 sm:-mx-6 -my-4 sm:-my-6 min-h-[calc(100dvh-56px)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="space-y-6">
      <section className="rounded-xl bg-gradient-to-r from-[#018942] to-[#016b35] px-6 py-5 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-lg font-bold">
            {initial || "?"}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Seu Perfil</h1>
            <p className="text-green-100 text-sm">Gerencie suas informações pessoais e configurações</p>
          </div>
        </div>
      </section>
      {loading ? (
        <div className="text-sm text-gray-600">Carregando…</div>
      ) : profile && userId ? (
        <>
          <ProfileForm
            userId={userId}
            fullName={profile.full_name}
            email={email}
            role={profile.role ?? undefined}
            onSaved={(name) => setProfile((p) => ({ ...(p as any), full_name: name }))}
            onLogout={onLogout}
          />
        </>
      ) : (
        <div className="text-sm text-red-600">Não foi possível carregar o perfil.</div>
      )}
      </div>
    </div>
  );
}
