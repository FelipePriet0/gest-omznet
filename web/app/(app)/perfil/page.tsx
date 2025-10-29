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
      <div className="space-y-8">
      <section className="group relative overflow-hidden rounded-[50px] bg-gradient-to-br from-[#018942] to-black px-8 py-8 text-white shadow-2xl shadow-[#FFFFFF]/30 border-2 border-white/90 transition-all duration-500 hover:shadow-3xl hover:scale-[1.02]">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 opacity-50"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/20 to-transparent rounded-full -translate-y-32 translate-x-32 group-hover:scale-110 transition-transform duration-700"></div>
        
        <div className="relative flex items-center gap-6">
          <div className="relative group/avatar">
            <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-white/90 bg-gradient-to-br from-white/30 to-white/10 text-2xl font-bold shadow-2xl shadow-[#FFFFFF]/30 backdrop-blur-sm transition-all duration-300 group-hover/avatar:scale-110 group-hover/avatar:rotate-3">
              {initial || "?"}
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-[50px] blur opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">
              {profile?.full_name ? (
                <>
                  {profile.full_name}
                  {profile.role && (
                    <span className="text-green-100 font-normal"> ({profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()})</span>
                  )}
                </>
              ) : (
                <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Seu Perfil</span>
              )}
            </h1>
            <p className="text-green-100 text-base leading-relaxed">
              Gerencie suas informações pessoais e configurações com elegância
            </p>
          </div>
          {/* Email badge removido conforme solicitação */}
        </div>
      </section>
      {loading ? (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-xl ring-1 ring-white/50">
            <div className="h-6 w-48 animate-pulse rounded-lg bg-gradient-to-r from-gray-200 to-gray-300" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="group rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-xl ring-1 ring-white/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
              <div className="mb-4 h-5 w-36 animate-pulse rounded-lg bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-gradient-to-r from-gray-200 to-gray-300" />
            </div>
            <div className="group rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-xl ring-1 ring-white/50 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
              <div className="mb-4 h-5 w-32 animate-pulse rounded-lg bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-gradient-to-r from-gray-200 to-gray-300" />
            </div>
          </div>
        </div>
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
