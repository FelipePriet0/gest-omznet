"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";

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
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-zinc-600">Carregando seu perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-emerald-50/30">
      {/* Hero Section com Gradiente */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-zinc-900 pb-32 pt-8">
        {/* Elementos decorativos */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-zinc-800 rounded-full filter blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb/Navigation */}
          <div className="flex items-center gap-2 text-white/60 text-sm mb-8 animate-element animate-delay-100">
            <span>Configurações</span>
            <span>/</span>
            <span className="text-white">Perfil</span>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 animate-element animate-delay-200">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border-2 border-white/30 flex items-center justify-center text-3xl font-bold text-white shadow-2xl group-hover:scale-105 transition-transform duration-300">
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

      {/* Content Section */}
      <div className="relative -mt-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Pessoais Card */}
            <div className="animate-element animate-delay-300 bg-white rounded-2xl shadow-lg shadow-black/5 border border-zinc-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="p-6 border-b border-zinc-100 bg-gradient-to-r from-white to-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">👤</div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Informações Pessoais</h2>
                    <p className="text-sm text-zinc-600">Atualize seus dados pessoais</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                {/* Nome */}
                <div className="space-y-2 group">
                  <label htmlFor="full_name" className="text-sm font-medium text-zinc-700">
                    Nome Completo
                  </label>
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
            <div className="animate-element animate-delay-400 bg-white rounded-2xl shadow-lg shadow-black/5 border border-zinc-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="p-6 border-b border-zinc-100 bg-gradient-to-r from-white to-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">✉️</div>
          <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Informações da Conta</h2>
                    <p className="text-sm text-zinc-600">Dados de acesso e permissões</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                {/* E-mail */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                    E-mail
                  </label>
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
                  <label htmlFor="role" className="text-sm font-medium text-zinc-700">
                    Função / Cargo
                  </label>
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
          </div>

          {/* Sidebar - 1/3 */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="animate-element animate-delay-500 bg-white rounded-2xl shadow-lg shadow-black/5 border border-zinc-200/50 overflow-hidden sticky top-6">
              <div className="p-6 border-b border-zinc-100">
                <h3 className="font-semibold text-zinc-900">Ações Rápidas</h3>
              </div>
              
              <div className="p-6 space-y-3">
                {/* Botão Salvar */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-11 text-base"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>

                {/* Botão Sair */}
                <button
                  onClick={handleLogout}
                  className="w-full h-11 text-base"
                >
                  Sair da Conta
                </button>
              </div>

              {/* Info Box */}
              <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-t border-emerald-100">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">💡</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-emerald-900">Dica</h4>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Mantenha suas informações atualizadas para melhor experiência no sistema.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
