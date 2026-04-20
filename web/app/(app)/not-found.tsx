import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-neutral-200 bg-[var(--neutro)] px-6 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Área interna
      </p>
      <h1 className="text-3xl font-semibold text-zinc-900">
        Conteúdo não encontrado
      </h1>
      <p className="max-w-md text-sm text-zinc-600">
        A rota solicitada não existe neste painel ou não está mais disponível.
      </p>
      <Link
        href="/kanban/analise"
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
      >
        Voltar para análise
      </Link>
    </main>
  );
}
