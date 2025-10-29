export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[#ECF4FA] text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="/" className="font-semibold text-zinc-900">Mznet</a>
          <div className="flex items-center gap-4 text-sm">
            <a className="text-zinc-700 hover:text-zinc-900 hover:underline" href="/perfil">Perfil</a>
            <a className="text-zinc-700 hover:text-zinc-900 hover:underline" href="/kanban">Kanban</a>
            <a className="text-zinc-700 hover:text-zinc-900 hover:underline" href="/historico">Histórico</a>
            <a className="text-zinc-700 hover:text-zinc-900 hover:underline" href="/tarefas">Minhas Tarefas</a>
            {/* Inbox (sino) */}
            <InboxBellWrapper />
          </div>
        </nav>
      </header>
      <main className="mx-auto min-h-[calc(100dvh-56px)] max-w-6xl px-6 py-6 bg-white rounded-t-xl">{children}</main>
      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500">© MZNET</footer>
    </div>
  );
}

function InboxBellWrapper() {
  // Client-only component wrapper to avoid marking the whole layout as client
  // eslint-disable-next-line @next/next/no-async-client-component
  const Comp = require("@/features/inbox/InboxDrawer").InboxBell as React.ComponentType;
  // @ts-ignore
  return <Comp />;
}
