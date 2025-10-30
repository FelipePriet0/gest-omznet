import InboxBell from "./InboxBell.client";
import { Kanban, ListChecks, History, UserRound } from "lucide-react";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-[#ECF4FA] text-zinc-900">
      {/* Header removed as requested */}

      {/* Floating sidebar with large radius and small top gap */}
      <div className="flex gap-1 px-6 pt-10 pb-6">
        <aside className="group sticky top-10 w-16 hover:w-80 transition-all duration-300 ease-out overflow-hidden shrink-0 rounded-[60px] bg-gradient-to-br from-[#018942] to-black text-white shadow-xl">
          <div className="flex h-full flex-col">
            {/* Brand above CTAs */}
            <div className="pt-6 px-3 mt-10 flex justify-center">
              <a href="/" className="flex items-center justify-center">
                {/* Small logo when collapsed */}
                <img src="/mznet-logo.png" alt="MZNET" className="h-10 w-auto group-hover:hidden block" />
                {/* Large logo when expanded */}
                <img src="/mznet-logo.png" alt="MZNET" className="hidden group-hover:block h-16 w-auto" />
              </a>
            </div>

            {/* Divider white line below logo */}
            <div className="mx-0 mt-12 mb-3 h-[3px] bg-white/90 hidden group-hover:block" />

            {/* Nav (hidden when collapsed) */}
            <nav className="mt-3 hidden flex-1 px-2 flex-col gap-[16px] group-hover:flex">
              <a href="/kanban" className="relative block mx-auto w-[85%] rounded-full border-2 border-white/80 bg-white/20 px-3 py-2 text-[15px] font-semibold text-white hover:bg-white/30" style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)" }}>
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
                      <Kanban className="h-4 w-4" />
                    </span>
                    <span className="hidden group-hover:inline transition-all">Kanban</span>
                  </span>
                  <span className="hidden group-hover:flex items-center gap-2 transition-all">
                    <svg className="h-4 w-4 text-white/90" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 5.5l5 4.5-5 4.5"/></svg>
                    <span className="h-7 w-[6px] rounded-full bg-white/60" />
                  </span>
                </span>
              </a>
              <a href="/tarefas" className="relative block mx-auto w-[85%] rounded-full border-2 border-white/80 bg-white/20 px-3 py-2 text-[15px] font-semibold text-white hover:bg-white/30" style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)" }}>
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
                      <ListChecks className="h-4 w-4" />
                    </span>
                    <span className="hidden group-hover:inline transition-all">Minhas Tarefas</span>
                  </span>
                  <span className="hidden group-hover:flex items-center gap-2 transition-all">
                    <svg className="h-4 w-4 text-white/90" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 5.5l5 4.5-5 4.5"/></svg>
                    <span className="h-7 w-[6px] rounded-full bg-white/60" />
                  </span>
                </span>
              </a>
              <a href="/historico" className="relative block mx-auto w-[85%] rounded-full border-2 border-white/80 bg-white/20 px-3 py-2 text-[15px] font-semibold text-white hover:bg-white/30" style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)" }}>
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
                      <History className="h-4 w-4" />
                    </span>
                    <span className="hidden group-hover:inline transition-all">Histórico</span>
                  </span>
                  <span className="hidden group-hover:flex items-center gap-2 transition-all">
                    <svg className="h-4 w-4 text-white/90" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 5.5l5 4.5-5 4.5"/></svg>
                    <span className="h-7 w-[6px] rounded-full bg-white/60" />
                  </span>
                </span>
              </a>
              <a href="/perfil" className="relative block mx-auto w-[85%] rounded-full border-2 border-white/80 bg-white/20 px-3 py-2 text-[15px] font-semibold text-white hover:bg-white/30" style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)" }}>
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="hidden group-hover:inline transition-all">Meu Perfil</span>
                  </span>
                  <span className="hidden group-hover:flex items-center gap-2 transition-all">
                    <svg className="h-4 w-4 text-white/90" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 5.5l5 4.5-5 4.5"/></svg>
                    <span className="h-7 w-[6px] rounded-full bg-white/60" />
                  </span>
                </span>
              </a>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute right-0 top-0 z-10 mt-2 mr-4 md:mr-6">
            <InboxBell />
          </div>
          <main className="min-h-[100dvh] w-full min-w-0 overflow-x-auto p-4 md:p-6">{children}</main>
        </div>
      </div>

      {/* Footer removed as requested */}
    </div>
  );
}
