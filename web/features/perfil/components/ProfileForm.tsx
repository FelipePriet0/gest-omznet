"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function ProfileForm({
  userId,
  fullName: initialFullName,
  email,
  role,
  onSaved,
  onLogout,
}: {
  userId: string;
  fullName: string | null | undefined;
  email?: string | null;
  role?: string | null;
  onSaved?: (name: string) => void;
  onLogout?: () => Promise<void> | void;
}) {
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);
      if (error) throw error;
      setOk(true);
      onSaved?.(fullName);
    } catch (err: any) {
      setError(err?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Informações Pessoais */}
      <section className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-2xl ring-1 ring-white/50 transition-all duration-500 hover:shadow-3xl hover:scale-[1.01]">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 via-transparent to-[#8b5cf6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] shadow-lg"></span>
            <h2 className="text-lg font-bold text-gray-800 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Informações Pessoais
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2 group/input">
              <label className="text-sm font-semibold text-gray-700 mb-2 block" htmlFor="full_name">
                Nome completo *
              </label>
              <div className="relative">
                <input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="peer w-full rounded-xl border-2 border-gray-200 bg-white/50 px-6 py-4 text-base text-gray-900 placeholder-gray-400 shadow-lg backdrop-blur-sm transition-all duration-300 focus:border-[#3b82f6] focus:bg-white focus:shadow-2xl focus:ring-4 focus:ring-[#3b82f6]/20 focus:outline-none group-hover/input:border-[#3b82f6]/50"
                  placeholder="Seu nome completo"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 opacity-0 peer-focus:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
              <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#3b82f6]"></span>
                Como deseja que seu nome apareça para a equipe
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Informações da Conta */}
      <section className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-2xl ring-1 ring-white/50 transition-all duration-500 hover:shadow-3xl hover:scale-[1.01]">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/5 via-transparent to-[#059669]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[#10b981] to-[#059669] shadow-lg"></span>
            <h2 className="text-lg font-bold text-gray-800 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Informações da Conta
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="group/input">
              <label className="text-sm font-semibold text-gray-700 mb-2 block" htmlFor="email">
                E-mail
              </label>
              <div className="relative">
                <input
                  id="email"
                  value={email ?? ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border-2 border-gray-200 bg-gray-50/80 px-6 py-4 text-base text-gray-600 placeholder-gray-400 shadow-lg backdrop-blur-sm transition-all duration-300 focus:border-[#10b981] focus:bg-white focus:shadow-2xl focus:ring-4 focus:ring-[#10b981]/20 focus:outline-none"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                </div>
              </div>
            </div>
            <div className="group/input">
              <label className="text-sm font-semibold text-gray-700 mb-2 block" htmlFor="role">
                Função
              </label>
              <div className="relative">
                <input
                  id="role"
                  value={(role ?? "").toString()}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border-2 border-gray-200 bg-gray-50/80 px-6 py-4 text-base capitalize text-gray-600 placeholder-gray-400 shadow-lg backdrop-blur-sm transition-all duration-300 focus:border-[#10b981] focus:bg-white focus:shadow-2xl focus:ring-4 focus:ring-[#10b981]/20 focus:outline-none"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ações */}
      <section className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-2xl ring-1 ring-white/50 transition-all duration-500 hover:shadow-3xl hover:scale-[1.01]">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ef4444]/5 via-transparent to-[#dc2626]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[#ef4444] to-[#dc2626] shadow-lg"></span>
            <h2 className="text-lg font-bold text-gray-800 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Ações
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              onClick={onSubmit as any}
              className="group/btn relative overflow-hidden rounded-xl bg-gradient-to-r from-[#018942] to-[#016b35] px-8 py-4 text-base font-bold text-white shadow-2xl transition-all duration-300 hover:from-[#016b35] hover:to-[#014d28] hover:shadow-3xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center gap-2">
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Salvando…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Salvar Alterações
                  </>
                )}
              </span>
            </button>
            
            <button
              type="button"
              onClick={() => onLogout?.()}
              className="group/btn relative overflow-hidden rounded-xl border-2 border-gray-300 bg-white/80 px-8 py-4 text-base font-bold text-gray-700 shadow-xl backdrop-blur-sm transition-all duration-300 hover:bg-white hover:border-gray-400 hover:shadow-2xl hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair da Conta
              </span>
            </button>
            
            <div className="flex-1 min-w-0">
              <span aria-live="polite" className="text-sm font-medium">
                {ok && (
                  <span className="inline-flex items-center gap-2 text-emerald-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Salvo com sucesso!
                  </span>
                )}
                {error && (
                  <span className="inline-flex items-center gap-2 text-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {error}
                  </span>
                )}
              </span>
            </div>
          </div>
          
          <div className="mt-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-200">
            <p className="text-sm text-gray-600 flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>O avatar e dados do perfil são públicos para a equipe interna.</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
