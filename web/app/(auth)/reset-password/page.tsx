"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      // Para redefinir senha, o usuário precisa ter chegado por um link de recuperação (sessão temporária)
      if (!data.session) {
        setError("Link inválido ou expirado. Solicite um novo e-mail de redefinição.");
      } else {
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setMessage("Senha redefinida com sucesso. Você já pode fazer login.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err: any) {
      setError(err?.message || "Não foi possível redefinir a senha.");
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
        <h1 className="text-xl font-semibold text-white">Redefinir senha</h1>
        <p className="mt-2 text-sm text-white/80">Crie uma nova senha para sua conta.</p>
      </div>

      {!ready && !error && (
        <div className="text-sm text-white/80 text-center">Validando link…</div>
      )}

      {ready && (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-white/90">Nova senha</label>
            <div className="rounded-full bg-gradient-to-r from-emerald-700/70 to-zinc-700/50 p-[2px]">
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-white/70 outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm text-white/90">Confirmar nova senha</label>
            <div className="rounded-full bg-gradient-to-r from-emerald-700/70 to-zinc-700/50 p-[2px]">
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-full bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-white/70 outline-none"
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="mt-4 w-full h-11 rounded-full bg-emerald-500 text-base font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-70"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      )}

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
    </div>
  );
}
