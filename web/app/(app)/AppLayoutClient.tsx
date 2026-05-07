"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import RouteBg from "./RouteBg";
import { Sidebar, SidebarBody, SidebarLink, useSidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Columns3, Clock, CalendarDays, Wrench, FileDown } from "lucide-react";
import Image from "next/image";
import { SidebarUser } from "@/components/app/sidebar-user";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { FEATURES } from "@/lib/features";
import { supabase } from "@/lib/supabaseClient";

const PANEL_WIDTH_STORAGE_KEY = "mznet-app-panel-width";
const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 720;
const PANEL_DEFAULT_WIDTH = 440;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function AppSidebar() {
  const { open } = useSidebar();
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const panel = (search?.get('panel') || '').toLowerCase();

  const links = [
    {
      label: "Kanban",
      href: "/kanban",
      icon: <Columns3 className="h-5 w-5 text-white flex-shrink-0" />,
    },
    {
      label: "Agenda",
      href: "/agenda",
      icon: <CalendarDays className="h-5 w-5 text-white flex-shrink-0" />,
    },
    {
      label: "Histórico",
      href: "/historico",
      icon: <Clock className="h-5 w-5 text-white flex-shrink-0" />,
    },
    {
      label: "Builder",
      href: "/builder",
      icon: <Wrench className="h-5 w-5 text-white flex-shrink-0" />,
    },
  ];

  return (
    <SidebarBody className="justify-between gap-4">
      <SidebarHeader>
        {open ? (
          <div className="w-full flex items-center justify-between p-2 rounded-lg border border-transparent bg-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 text-white flex items-center justify-center overflow-hidden flex-shrink-0 relative" style={{ borderRadius: '30%', backgroundColor: '#ffffff' }}>
                <Image src="/mznet-logo.png" alt="MZNET Logo" fill sizes="40px" style={{ objectFit: 'contain' }} />
              </div>
              <div className="leading-tight ml-1">
                <div className="text-base font-semibold text-white">Mznet</div>
                <div className="text-sm text-white/80">Empresa</div>
              </div>
            </div>
          </div>
        ) : (
           <div className="w-full flex items-center justify-center">
             <div className="h-9 w-9 text-white flex items-center justify-center overflow-hidden flex-shrink-0 relative" style={{ borderRadius: '30%', backgroundColor: '#ffffff' }}>
               <Image src="/mznet-logo.png" alt="MZNET Logo" fill sizes="36px" style={{ objectFit: 'contain' }} />
             </div>
           </div>
        )}
      </SidebarHeader>
      <div className="border-t border-white/50 mx-2" />
      <SidebarContent>
        <SidebarGroup>
          {open && <SidebarGroupLabel>Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            {links.map((link) => {
              const isActive =
                link.label === "Kanban"
                  ? pathname.startsWith("/kanban")
                  : link.label === "Agenda"
                  ? pathname.startsWith("/agenda")
                  : link.label === "Histórico"
                  ? pathname.startsWith("/historico")
                  : link.label === "Builder"
                  ? pathname.startsWith("/builder")
                  : false;
              return (
                <Fragment key={link.label}>
                  <SidebarLink link={link} isActive={isActive} />
                </Fragment>
              );
            })}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
    </SidebarBody>
  );
}

export function AppLayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}

function InactivityWarning({ secondsLeft, onStayLoggedIn }: { secondsLeft: number; onStayLoggedIn: () => void }) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const label = mins > 0 ? `${mins}m ${String(secs).padStart(2, "0")}s` : `${secs}s`;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Sessão prestes a expirar</h2>
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
          Você ficará desconectado por inatividade em <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>.
        </p>
        <button
          onClick={onStayLoggedIn}
          className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:opacity-80"
        >
          Continuar conectado
        </button>
      </div>
    </div>
  );
}

function AppLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState<number | null>(null);

  const handleWarn = useCallback((s: number) => setInactivitySecondsLeft(s), []);
  const handleDismissWarn = useCallback(() => setInactivitySecondsLeft(null), []);
  useInactivityLogout(handleWarn, handleDismissWarn);

  const isDesktop = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("resize", onStoreChange);
      return () => window.removeEventListener("resize", onStoreChange);
    },
    () => (typeof window === "undefined" ? true : window.innerWidth >= 768),
    () => true
  );
  // Initialize with a stable SSR-safe value to avoid hydration mismatch.
  // Load the persisted value after mount.
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const resizeOriginRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: PANEL_DEFAULT_WIDTH });
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const router = useRouter();
  const parts = pathname.split("/").filter(Boolean);
  const isCanvas = pathname.startsWith('/builder/canvas');
  const isExpandedCadastro = parts[0] === 'cadastro' && (parts[1] === 'pf' || parts[1] === 'pj') && parts.length >= 3;
  const exportMode = (search?.get('from') || '').toLowerCase() === 'export';
  const standaloneMode = search?.get('standalone') === '1';
  const activePanel = (search?.get('panel') || '').toLowerCase();
  const isInboxPanel = activePanel === 'inbox';
  const isPanelOpen = isInboxPanel;
  const pageGutter = 6;
  const panelHeight = `calc(100vh - ${pageGutter * 2}px)`;

  function onDownloadPdf() { try { window.print(); } catch {} }
  async function onExportPdf(parts: string[]) {
    try {
      let tipo = '';
      let id = '';
      const root = document.getElementById('mz-print-root');
      if (root) {
        tipo = (root.getAttribute('data-tipo') || '').toLowerCase();
        id = root.getAttribute('data-id') || '';
      }
      if (!tipo || !id) {
        if (!Array.isArray(parts) || parts.length < 3) return;
        tipo = parts[1];
        id = parts[2];
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch(`/api/export/ficha/${tipo}/${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {}
  }

  const closePanel = () => {
    const params = new URLSearchParams(search?.toString() || '');
    params.delete('panel');
    const query = params.size ? `?${params.toString()}` : '';
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const panelTitle = isInboxPanel ? 'Caixa de Entrada' : '';
  const panelContent = null;

  const handlePanelResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isDesktop) return;
      if (event.button !== 0) return;
      event.preventDefault();
      resizeOriginRef.current = { startX: event.clientX, startWidth: panelWidth };
      setIsResizingPanel(true);
    },
    [isDesktop, panelWidth]
  );

  useEffect(() => {
    // Load persisted panel width after mount to keep SSR/CSR initial render in sync
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY) : null;
      if (stored) {
        const parsed = Number.parseInt(stored, 10);
        if (!Number.isNaN(parsed)) {
          setPanelWidth(clamp(parsed, PANEL_MIN_WIDTH, PANEL_MAX_WIDTH));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isPanelOpen) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidth));
    } catch {}
  }, [panelWidth, isPanelOpen]);

  useEffect(() => {
    if (!isResizingPanel) return;
    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const { startX, startWidth } = resizeOriginRef.current;
      const delta = event.clientX - startX;
      const next = clamp(startWidth + delta, PANEL_MIN_WIDTH, PANEL_MAX_WIDTH);
      setPanelWidth(next);
    };
    const handleMouseUp = () => {
      resizeOriginRef.current = { startX: 0, startWidth: PANEL_DEFAULT_WIDTH };
      setIsResizingPanel(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.removeProperty("cursor");
    };
  }, [isResizingPanel]);

  // Export mode (from=export): render only the page content (children), no sidebar/header/ctas
  if (exportMode && isExpandedCadastro) {
    return (
      <SidebarProvider open={false} setOpen={() => {}}>
        <main className="w-full min-h-screen bg-white text-black">
          {children}
        </main>
      </SidebarProvider>
    );
  }

  // Standalone mode: sem sidebar, sem breadcrumb — só ficha + zoom
  if (standaloneMode && isExpandedCadastro) {
    return (
      <SidebarProvider open={false} setOpen={() => {}}>
        <main className="w-full min-h-screen bg-[var(--neutro)] dark:bg-neutral-900 text-zinc-900 dark:text-zinc-100">
          <div className="grid grid-cols-3 items-center border-b border-neutral-200 dark:border-neutral-700 py-2 px-6">
            <div />
            <div className="flex items-center justify-center">
              <div id="mz-zoom-controls" className="flex items-center gap-1" />
            </div>
            {FEATURES.exportarFicha && (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => onExportPdf(parts)}
                  title="Exportar PDF"
                  className="flex items-center justify-center rounded-full border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <FileDown className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {children}
        </main>
      </SidebarProvider>
    );
  }

  return (
    <RouteBg>
      <SidebarProvider open={open} setOpen={setOpen}>
          <div className={`min-h-screen text-zinc-900 dark:text-zinc-100 ${isExpandedCadastro ? '' : 'h-screen overflow-hidden'}`} style={{ backgroundColor: '#000000' }}>
            <Sidebar open={open} setOpen={setOpen}>
              <AppSidebar />
            </Sidebar>
            <div
              className="flex flex-1 flex-col gap-3 transition-all duration-300 ease-in-out md:flex-row min-h-0 overflow-hidden"
              style={{
                marginLeft: isDesktop ? `${open ? 300 : 60}px` : "0px",
                paddingTop: pageGutter,
                paddingRight: pageGutter,
                paddingBottom: pageGutter,
                backgroundColor: '#000000',
              }}
            >
              <main
                className={
                  isCanvas
                    ? "flex flex-1 w-full flex-col gap-0 md:min-w-0 md:p-0"
                    : isExpandedCadastro
                    ? "flex flex-1 w-full flex-col gap-3 rounded-3xl border border-neutral-200 bg-[var(--neutro)] p-3 text-zinc-900 shadow-xl shadow-emerald-900/15 md:min-w-0 md:py-6 md:px-0 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-100"
                    : "flex flex-1 w-full flex-col gap-3 rounded-3xl border border-neutral-200 bg-[var(--neutro)] p-3 text-zinc-900 shadow-xl shadow-emerald-900/15 md:min-w-0 md:p-6 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-100 overflow-y-auto overscroll-contain app-scroll"
                }
                style={isExpandedCadastro ? undefined : { height: `calc(100vh - ${pageGutter * 2}px)` }}
              >
                {!isCanvas && (
                  <div className={`mb-2 ${isExpandedCadastro ? 'grid grid-cols-3 px-6' : 'flex justify-between'} items-center gap-3`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <SidebarTrigger className="hidden md:inline-flex" />
                    </div>
                    {isExpandedCadastro && (
                      <div className="flex items-center justify-center">
                        <div id="mz-zoom-controls" className="flex items-center gap-1" />
                      </div>
                    )}
                    {isExpandedCadastro && FEATURES.exportarFicha && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onExportPdf(parts)}
                          title="Exportar PDF"
                          className="flex items-center justify-center rounded-full border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {children}
              </main>
              {isPanelOpen && (
                <aside
                  role="complementary"
                  aria-label={panelTitle}
                  className="group/panel relative flex shrink-0 flex-col rounded-3xl border border-neutral-200 bg-[var(--neutro)] shadow-[4px_0_12px_rgba(0,0,0,0.12)] dark:border-neutral-700 dark:bg-neutral-900 md:order-first"
                  style={{
                    width: isDesktop ? panelWidth : `calc(100% - ${pageGutter * 2}px)`,
                    minWidth: isDesktop ? PANEL_MIN_WIDTH : undefined,
                    maxWidth: isDesktop ? PANEL_MAX_WIDTH : undefined,
                    height: isDesktop ? panelHeight : "auto",
                  }}
                >
                  {isDesktop && (
                    <div
                      role="presentation"
                      aria-hidden="true"
                      onMouseDown={handlePanelResizeStart}
                      className="absolute -right-3 top-0 bottom-0 flex w-3 cursor-col-resize items-center justify-center"
                    >
                      <span className="h-12 w-[3px] rounded-full bg-neutral-300 transition-colors group-hover/panel:bg-[var(--color-primary)]" />
                    </div>
                  )}
                  <div className="px-3 py-2 border-b border-neutral-200 md:px-4 md:py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <SidebarTrigger className="hidden md:inline-flex" />
                      <span className="text-h4 font-semibold text-[var(--color-primary)] truncate">{panelTitle}</span>
                    </div>
                    <button
                      onClick={closePanel}
                      aria-label="Fechar"
                      className="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain modal-scroll p-3 md:p-4">
                    {panelContent}
                  </div>
                </aside>
              )}
            </div>
          </div>
      </SidebarProvider>
      {inactivitySecondsLeft !== null && (
        <InactivityWarning secondsLeft={inactivitySecondsLeft} onStayLoggedIn={handleDismissWarn} />
      )}
    </RouteBg>
  );
}
