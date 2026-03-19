"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ProfileData = {
  full_name: string | null;
  role: string | null;
};

export default function PerfilPage() {
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    role: "",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setEmail(data.user.email ?? "");
      
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", data.user.id)
        .single();
      
      if (!profErr && prof) {
        setProfile({
          full_name: prof.full_name ?? "",
          role: prof.role ?? "",
        });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
        })
        .eq("id", userId);
      
      if (error) throw error;
      alert("✓ Perfil atualizado com sucesso!");
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const getInitials = () => {
    const name = profile.full_name || email;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#e4e4e4]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-zinc-600">Carregando seu perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--neutro)]">
      {/* Content Section */}
      <div className="max-w-3xl mx-auto pt-8 pb-12 px-8 md:px-12 lg:px-16">
          {/* Profile Header Card */}
        <div className="mb-6">
          <div className="animate-element animate-delay-100 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 p-6 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                  {getInitials()}
                </div>
                <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-2">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">
                  {profile.full_name || "Seu Perfil"}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-white/90">
                  <div className="flex items-center gap-2 text-sm">
                    <span aria-hidden>💼</span>
                    <span>{profile.role || "Cargo não definido"}</span>
                  </div>
                  <span className="text-white/40">•</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span aria-hidden>✉️</span>
                    <span>{email}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações Pessoais Card */}
          <div className="animate-element animate-delay-300 bg-white rounded-2xl shadow-lg shadow-zinc-900/10 hover:shadow-xl hover:shadow-zinc-900/15 overflow-hidden transition-all duration-300">
            <div className="p-6 border-b border-emerald-600 bg-emerald-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white">👤</div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Informações Pessoais</h2>
                  <p className="text-sm text-white/90">Atualize seus dados pessoais</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Nome */}
              <div className="space-y-2 group">
                <Label htmlFor="full_name">
                  Nome Completo
                </Label>
                <Input
                  id="full_name"
                  placeholder="Digite seu nome completo"
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Informações da Conta Card */}
          <div className="animate-element animate-delay-400 bg-white rounded-2xl shadow-lg shadow-zinc-900/10 hover:shadow-xl hover:shadow-zinc-900/15 overflow-hidden transition-all duration-300">
            <div className="p-6 border-b border-emerald-600 bg-emerald-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white">✉️</div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Informações da Conta</h2>
                  <p className="text-sm text-white/90">Dados de acesso e permissões</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  E-mail
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    Verificado
                  </span>
                </div>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
                  O e-mail não pode ser alterado
                </p>
              </div>

              {/* Função */}
              <div className="space-y-2">
                <Label htmlFor="role">
                  Função / Cargo
                </Label>
                <Input
                  id="role"
                  value={profile.role || "Não definido"}
                  disabled
                />
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
                  Definido pelo administrador do sistema
                </p>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div className="animate-element animate-delay-500 bg-white rounded-2xl shadow-lg shadow-zinc-900/10 hover:shadow-xl hover:shadow-zinc-900/15 overflow-hidden transition-all duration-300">
            <div className="p-6 border-b border-emerald-600 bg-emerald-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white">⚡</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Ações Rápidas</h3>
                  <p className="text-sm text-white/90">Gerencie sua conta</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex gap-3">
                {/* Botão Sair */}
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                >
                  Sair da Conta
                </Button>

                {/* Botão Salvar */}
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
