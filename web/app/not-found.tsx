import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center text-[var(--foreground)]">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
        404
      </p>
      <h1 className="text-3xl font-semibold text-zinc-900">
        Página não encontrada
      </h1>
      <p className="max-w-md text-sm text-zinc-600">
        O endereço solicitado não existe ou não está mais disponível.
      </p>
      <Link
        href="/kanban/analise"
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
      >
        Ir para análise
      </Link>
    </main>
  );
}
