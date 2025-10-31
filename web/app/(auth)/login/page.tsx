"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, clearStaleSupabaseSession } from '@/lib/supabaseClient';

// --- HELPER COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/20 bg-white/50 backdrop-blur-sm transition-all focus-within:border-emerald-500 focus-within:bg-white/50">
    {children}
  </div>
);

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const rememberMe = !!form.get('rememberMe');

    try {
      // Opcional: limpar sessão antiga quebrada
      clearStaleSupabaseSession();

      // Sign in via Supabase Auth
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Se não quiser persistir, pode-se forçar um reload sem armazenar (opcional em outra iteração)
      // Navega para o Kanban após sucesso
      router.replace('/kanban');
    } catch (err: any) {
      alert(err?.message || 'Falha ao entrar. Verifique suas credenciais.');
      setIsLoading(false);
      return;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row-reverse w-full bg-zinc-900">
      {/* Coluna Direita - Formulário */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-extrabold leading-tight text-white">
              Seja Bem-Vindo
            </h1>
            <p className="animate-element animate-delay-200 text-zinc-300">
              Acesse sua conta e continue sua jornada
            </p>

            {/* Formulário */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-zinc-300">E-mail</label>
                <GlassInputWrapper>
                  <input 
                    name="email" 
                    type="email" 
                    required
                    autoFocus
                    placeholder="Digite seu E-mail" 
                    className="w-full bg-white text-sm p-4 rounded-2xl focus:outline-none text-black placeholder:text-black" 
                  />
                </GlassInputWrapper>
              </div>

              {/* Password */}
              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-zinc-300">Senha</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input 
                      name="password" 
                      type={showPassword ? 'text' : 'password'} 
                      required
                      placeholder="Digite sua senha" 
                      className="w-full bg-white text-sm p-4 pr-12 rounded-2xl focus:outline-none text-black placeholder:text-black" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      <span className="text-xs text-black/80 hover:text-black/70">
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </span>
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {/* Remember Me */}
              <div className="animate-element animate-delay-500 flex items-center justify-end text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="rememberMe" 
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-600/20 cursor-pointer transition-all"
                  />
                  <span className="text-zinc-300">Manter-me conectado</span>
                </label>
              </div>

              {/* Botão Entrar */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="animate-element animate-delay-600 w-full rounded-2xl bg-emerald-600 py-4 font-semibold text-white hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Coluna Esquerda - Hero Visual */}
      <section className="hidden md:block flex-1 relative p-4">
        <div 
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center overflow-hidden shadow-lg shadow-white/10 hover:shadow-white/20 transition-shadow duration-300"
        >
          {/* Gradiente com Logo */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-zinc-900 to-emerald-600">
            {/* Padrão decorativo de fundo */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-zinc-800 rounded-full filter blur-3xl opacity-20 animate-pulse animation-delay-1000" />
            </div>
            
            {/* Logo Centralizada */}
            <div className="relative z-10 flex items-center justify-center h-full">
              <Image
                src="/mznet-logo.png"
                alt="MZNET Logo"
                width={256}
                height={256}
                className="object-contain filter drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
