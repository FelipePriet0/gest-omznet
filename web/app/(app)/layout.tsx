"use client";

import { Fragment, Suspense, useCallback, useEffect, useRef, useState } from "react";
import RouteBg from "./RouteBg";
import { Sidebar, SidebarBody, SidebarLink, useSidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Columns3, ListTodo, Clock, CalendarDays, Wrench } from "lucide-react";
import Image from "next/image";
import { SidebarUser } from "@/components/app/sidebar-user";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/app/Breadcrumbs";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { InboxSidebarEntry, InboxProvider, InboxPanel } from "@/features/inbox/InboxDrawer";
const TasksPanelProxy = dynamic(() => import("@/app/(app)/tarefas/page"), { ssr: false });

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
      label: "Minhas Tarefas",
      href: `${pathname}?panel=tarefas`,
      icon: <ListTodo className="h-5 w-5 text-white flex-shrink-0" />,
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
                  : link.label === "Minhas Tarefas"
                  ? panel === "tarefas"
                  : link.label === "Histórico"
                  ? pathname.startsWith("/historico")
                  : link.label === "Builder"
                  ? pathname.startsWith("/builder")
                  : false;
              return (
                <Fragment key={link.label}>
                  <SidebarLink link={link} isActive={isActive} />
                  {link.label === "Minhas Tarefas" && <InboxSidebarEntry />}
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

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div />}> 
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  );
}

function AppLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const resizeOriginRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: PANEL_DEFAULT_WIDTH });
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const router = useRouter();
  const parts = pathname.split("/").filter(Boolean);
  const isCanvas = pathname.startsWith('/builder/canvas');
  const isExpandedCadastro = parts[0] === 'cadastro' && (parts[1] === 'pf' || parts[1] === 'pj') && parts.length >= 3;
  const activePanel = (search?.get('panel') || '').toLowerCase();
  const isTasksPanel = activePanel === 'tarefas';
  const isInboxPanel = activePanel === 'inbox';
  const isPanelOpen = isTasksPanel || isInboxPanel;
  const pageGutter = 6;
  const panelHeight = `calc(100vh - ${pageGutter * 2}px)`;

  // Do not force open the sidebar automatically when opening the Tasks drawer

  function onDownloadPdf() { try { window.print(); } catch {} }

  const closePanel = () => {
    const params = new URLSearchParams(search?.toString() || '');
    params.delete('panel');
    const query = params.size ? `?${params.toString()}` : '';
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const panelTitle = isTasksPanel ? 'Minhas Tarefas' : isInboxPanel ? 'Caixa de Entrada' : '';
  const panelContent = isTasksPanel ? <TasksPanelProxy /> : isInboxPanel ? <InboxPanel /> : null;

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
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
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

  return (
    <RouteBg>
      <SidebarProvider open={open} setOpen={setOpen}>
        <InboxProvider panelOpen={isInboxPanel}>
          <div className="text-zinc-900 min-h-screen" style={{ backgroundColor: '#000000' }}>
            <Sidebar open={open} setOpen={setOpen}>
              <AppSidebar />
            </Sidebar>
            <div
              className="flex flex-1 flex-col gap-3 transition-all duration-300 ease-in-out md:flex-row"
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
                    : "flex flex-1 w-full flex-col gap-3 rounded-3xl border border-neutral-200 bg-[var(--neutro)] p-3 text-zinc-900 shadow-xl shadow-emerald-900/15 md:min-w-0 md:p-6 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-100"
                }
                style={{ minHeight: `calc(100vh - ${pageGutter * 2}px)` }}
              >
                {!isCanvas && (
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <SidebarTrigger className="hidden md:inline-flex" />
                      <Breadcrumbs />
                    </div>
                    {isExpandedCadastro && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={onDownloadPdf} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Baixar PDF</button>
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
                    <button onClick={closePanel} aria-label="Fechar" className="p-2 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700">
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
        </InboxProvider>
      </SidebarProvider>
    </RouteBg>
  );
}

 
