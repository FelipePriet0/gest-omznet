"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function ProfileForm({
  userId,
  fullName: initialFullName,
  onSaved,
}: {
  userId: string;
  fullName: string | null | undefined;
  onSaved?: (name: string) => void;
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
    <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-4 text-lg font-semibold">Editar Perfil</h2>
      <div className="space-y-1">
        <label className="text-sm" htmlFor="full_name">Nome</label>
        <input
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">{saving ? "Salvando…" : "Salvar"}</button>
      </div>
      {ok && <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">Salvo com sucesso.</p>}
      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

