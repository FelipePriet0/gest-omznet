"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const form = e.currentTarget as HTMLFormElement;
      const email = (form.elements.namedItem("email") as HTMLInputElement).value;
      const password = (form.elements.namedItem("password") as HTMLInputElement).value;

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      setSuccess(true);
      router.push("/perfil");
    } catch (err: any) {
      setError(err?.message || "Falha ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-[30px] bg-gradient-to-r from-emerald-600 to-black p-4 sm:p-6 md:p-8 shadow-2xl shadow-[#FFFFFF]/30">
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-3 h-10 sm:h-12 md:h-14 flex items-center justify-center rounded-lg bg-white/5 px-3 py-1 text-2xl font-extrabold tracking-tight text-white">MZ<span className="text-emerald-400">net</span></div>
        <h1 className="text-lg font-semibold text-white">Entrar</h1>
      </div>

      <form className="space-y-4" action="#" method="post" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-white/90">E-mail</label>
          <div className="rounded-full bg-gradient-to-r from-emerald-700/70 to-zinc-700/50 p-[2px]">
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Seu e-mail"
              className="w-full rounded-full bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-white/70 outline-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-white/90">Senha</label>
          <div className="rounded-full bg-gradient-to-r from-emerald-700/70 to-zinc-700/50 p-[2px]">
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Sua senha"
              className="w-full rounded-full bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-white/70 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full h-11 rounded-full bg-emerald-500 text-base font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-70"
        >
          {loading ? "Processando..." : "Entrar"}
        </button>
        <div className="flex justify-end">
          <a href="/forgot-password" className="text-xs text-white/80 underline underline-offset-2 hover:text-white">Esqueci minha senha</a>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-md border border-emerald-300/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          Login realizado com sucesso.
        </div>
      )}
    </div>
  );
}
