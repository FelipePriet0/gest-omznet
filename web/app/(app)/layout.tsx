export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[#ECF4FA] text-zinc-900">
      <header className="sticky top-0 z-20 bg-gradient-to-br from-[#018942] to-black shadow-2xl shadow-[#FFFFFF]/30 border-b-2 border-white/90">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center">
            <img src="/mznet-logo.png" alt="Mznet" className="h-8 w-auto" />
          </a>
          <div className="flex items-center gap-4 text-sm">
            <a className="text-white/90 hover:text-white hover:underline transition-colors" href="/perfil">Perfil</a>
            <a className="text-white/90 hover:text-white hover:underline transition-colors" href="/kanban">Kanban</a>
            <a className="text-white/90 hover:text-white hover:underline transition-colors" href="/historico">Histórico</a>
            <a className="text-white/90 hover:text-white hover:underline transition-colors" href="/tarefas">Minhas Tarefas</a>
            {/* Inbox (sino) */}
            <InboxBellWrapper />
          </div>
        </nav>
      </header>
      <main className="mx-auto min-h-[calc(100dvh-100px)] max-w-6xl px-6 py-6 bg-white rounded-t-xl">{children}</main>
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
