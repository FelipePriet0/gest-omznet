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
    <div className="space-y-6">
      {/* Informações Pessoais */}
      <section className="rounded-xl bg-gray-50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
          <h2 className="text-sm font-semibold text-gray-700">Informações Pessoais</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="full_name">Nome completo *</label>
            <input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-[#018942] focus:ring-[#018942]"
              placeholder="Seu nome completo"
            />
          </div>
        </div>
      </section>

      {/* Informações da Conta */}
      <section className="rounded-xl bg-gray-50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#10b981]" />
          <h2 className="text-sm font-semibold text-gray-700">Informações da Conta</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="email">E-mail</label>
            <input
              id="email"
              value={email ?? ""}
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-500 focus:border-[#018942] focus:ring-[#018942]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="role">Função</label>
            <input
              id="role"
              value={(role ?? "").toString()}
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm capitalize text-gray-700 placeholder-gray-500 focus:border-[#018942] focus:ring-[#018942]"
            />
          </div>
        </div>
      </section>

      {/* Ações */}
      <section className="rounded-xl bg-gray-50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
          <h2 className="text-sm font-semibold text-gray-700">Ações</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            onClick={onSubmit as any}
            className="h-10 rounded-lg bg-gradient-to-r from-[#018942] to-[#016b35] px-5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#016b35] hover:to-[#014d28] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando…" : "Salvar Alterações"}
          </button>
          <button
            type="button"
            onClick={() => onLogout?.()}
            className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
          >
            Sair da Conta
          </button>
          {ok && <span className="text-xs text-emerald-700">Salvo com sucesso.</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <p className="mt-4 text-xs text-gray-600">Observação: O avatar e dados do perfil são públicos para a equipe interna.</p>
      </section>
    </div>
  );
}
