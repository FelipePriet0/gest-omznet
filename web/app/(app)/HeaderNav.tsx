"use client";

import { usePathname } from "next/navigation";
import { FEATURES } from "@/lib/features";

export default function HeaderNav() {
  const pathname = usePathname();
  const isPerfil = pathname?.startsWith("/perfil");
  const bgClass = isPerfil ? "bg-[#bdbdbd] dark:bg-zinc-900/95" : "bg-white/90 dark:bg-zinc-950/90";

  return (
    <header className={`sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 ${bgClass} backdrop-blur`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="/" className="font-semibold text-zinc-900 dark:text-zinc-100">Mznet</a>
        <div className="flex items-center gap-4 text-sm">
          <a className="text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100" href="/perfil">Perfil</a>
          <a className="text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100" href="/kanban">Kanban</a>
          <a className="text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100" href="/historico">Histórico</a>
          {FEATURES.minhasTarefas && <a className="text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100" href="/tarefas">Minhas Tarefas</a>}
        </div>
      </nav>
    </header>
  );
}
