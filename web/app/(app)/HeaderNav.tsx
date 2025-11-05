"use client";

import { usePathname } from "next/navigation";

export default function HeaderNav() {
  const pathname = usePathname();
  const isPerfil = pathname?.startsWith("/perfil");
  const bgClass = isPerfil ? "bg-[#bdbdbd]" : "bg-white/90";

  return (
    <header className={`sticky top-0 z-20 border-b border-zinc-200 ${bgClass} backdrop-blur`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="/" className="font-semibold text-zinc-900">Mznet</a>
        <div className="flex items-center gap-4 text-sm">
          <a className="text-zinc-700 hover:text-zinc-900 hover:underline" href="/perfil">Perfil</a>
          <a className="text-zinc-700 hover:text-zinc-900 hover:underline" href="/kanban">Kanban</a>
          <a className="text-zinc-700 hover:text-zinc-900 hover:underline" href="/historico">Histórico</a>
          <a className="text-zinc-700 hover:text-zinc-900 hover:underline" href="/tarefas">Minhas Tarefas</a>
        </div>
      </nav>
    </header>
  );
}
