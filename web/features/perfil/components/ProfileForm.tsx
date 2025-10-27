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
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <h2 className="text-base font-semibold text-zinc-900">Informações Pessoais</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm text-zinc-700" htmlFor="full_name">Nome completo</label>
            <div className="rounded-full border-2 border-white p-[2px]">
              <input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-full bg-black/5 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 outline-none"
                placeholder="Seu nome completo"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Informações da Conta */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          <h2 className="text-base font-semibold text-zinc-900">Informações da Conta</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-zinc-700" htmlFor="email">E-mail</label>
            <div className="rounded-full border-2 border-white p-[2px]">
              <input
                id="email"
                value={email ?? ""}
                readOnly
                className="w-full cursor-not-allowed rounded-full bg-black/5 px-4 py-2.5 text-sm text-zinc-700 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-zinc-700" htmlFor="role">Função</label>
            <div className="rounded-full border-2 border-white p-[2px]">
              <input
                id="role"
                value={(role ?? "").toString()}
                readOnly
                className="w-full cursor-not-allowed rounded-full bg-black/5 px-4 py-2.5 text-sm capitalize text-zinc-700 outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ações */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <h2 className="text-base font-semibold text-zinc-900">Ações</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            onClick={onSubmit as any}
            className="h-10 rounded-full border border-emerald-600 bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            {saving ? "Salvando…" : "Salvar Alterações"}
          </button>
          <button
            type="button"
            onClick={() => onLogout?.()}
            className="h-10 rounded-full border-2 border-zinc-300 bg-transparent px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Sair da Conta
          </button>
          {ok && <span className="text-xs text-emerald-700">Salvo com sucesso.</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <p className="mt-4 text-xs text-zinc-500">Observação: O avatar e dados do perfil são públicos para a equipe interna.</p>
      </section>
    </div>
  );
}
