"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <div className="w-full max-w-md rounded-[30px] bg-gradient-to-r from-emerald-600 to-black p-6 sm:p-8 shadow-2xl shadow-[#FFFFFF]/30">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4">
          <Image 
            src="/mznet-logo.png" 
            alt="MZnet Logo" 
            width={120} 
            height={40}
            className="h-10 sm:h-12 md:h-14 w-auto"
            loading="eager"
          />
        </div>
        <h1 className="text-xl font-semibold text-white">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-white/80">Informe seu e-mail para receber o link de redefinição.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-white/90">E-mail</label>
          <div className="rounded-full bg-gradient-to-r from-emerald-700/70 to-zinc-700/50 p-[2px]">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="w-full rounded-full bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-white/70 outline-none"
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading} 
          className="mt-4 w-full h-11 rounded-full bg-emerald-500 text-base font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-70"
        >
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>

      {message && (
        <div className="mt-4 rounded-md border border-emerald-300/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-white/80">
        <a href="/login" className="underline underline-offset-2 hover:text-white">Voltar para Login</a>
      </p>
    </div>
  );
}
