"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (err) throw err;
      setMessage("Se o e-mail existir, enviaremos um link de redefinição.");
    } catch (err: any) {
      setError(err?.message || "Não foi possível enviar o e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="mb-1 text-xl font-semibold">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">Informe seu e-mail para receber o link de redefinição.</p>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm">E-mail</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button type="submit" disabled={loading} className="mt-2 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>

      {message && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-zinc-500">
        <a href="/login" className="underline underline-offset-2">Voltar para Login</a>
      </p>
    </div>
  );
}
