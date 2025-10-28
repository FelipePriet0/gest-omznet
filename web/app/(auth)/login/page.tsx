"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

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
    <div className="w-full max-w-md rounded-[30px] bg-gradient-to-r from-emerald-600 to-black p-6 sm:p-8 shadow-2xl shadow-[#FFFFFF]/30 border-2 border-white/90">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4">
          <Image
            src="/mznet-logo.png"
            alt="MZNET"
            width={140}
            height={48}
            className="h-10 sm:h-12 md:h-14 w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
            priority
          />
        </div>
        <h1 className="text-xl font-semibold text-white">Entrar</h1>
      </div>

      <form className="space-y-4" action="#" method="post" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-white/90">E-mail</label>
          <div className="rounded-full border-2 border-white p-[2px]">
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Seu e-mail"
              className="w-full rounded-full bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/70 outline-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-white/90">Senha</label>
          <div className="rounded-full border-2 border-white p-[2px]">
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Sua senha"
              className="w-full rounded-full bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/70 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full h-11 rounded-full bg-white border border-white text-base font-semibold text-emerald-800 shadow hover:bg-white disabled:opacity-70"
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
