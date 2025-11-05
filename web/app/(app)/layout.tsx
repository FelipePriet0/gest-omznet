"use client";

import { useState, useEffect } from "react";
import RouteBg from "./RouteBg";
import { Sidebar, SidebarBody, SidebarLink, useSidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { Columns3, ListTodo, Clock } from "lucide-react";
import Image from "next/image";
import { SidebarUser } from "@/components/app/sidebar-user";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/app/Breadcrumbs";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const TasksPanelProxy = dynamic(() => import("@/app/(app)/tarefas/page"), { ssr: false });

function AppSidebar() {
  const { open } = useSidebar();
  const pathname = usePathname() || "/";

  const links = [
    {
      label: "Kanban",
      href: "/kanban",
      icon: <Columns3 className="h-5 w-5 text-white flex-shrink-0" />,
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
  ];

  return (
    <SidebarBody className="justify-between gap-4">
      <SidebarHeader>
        {open ? (
          <div className="w-full flex items-center justify-between p-2 rounded-lg border border-transparent bg-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 text-white flex items-center justify-center overflow-hidden flex-shrink-0" style={{ borderRadius: '30%', backgroundColor: '#ffffff' }}>
                <Image src="/mznet-logo.png" alt="MZNET Logo" width={28} height={28} className="object-contain" />
              </div>
              <div className="leading-tight ml-1">
                <div className="text-base font-semibold text-white">Mznet</div>
                <div className="text-sm text-white/80">Empresa</div>
              </div>
            </div>
          </div>
        ) : (
           <div className="w-full flex items-center justify-center">
             <div className="h-9 w-9 text-white flex items-center justify-center overflow-hidden flex-shrink-0" style={{ borderRadius: '30%', backgroundColor: '#ffffff' }}>
               <Image src="/mznet-logo.png" alt="MZNET Logo" width={24} height={24} className="object-contain" />
             </div>
           </div>
        )}
      </SidebarHeader>
      <div className="border-t border-white/50 mx-2" />
      <SidebarContent>
        <SidebarGroup>
          {open && <SidebarGroupLabel>Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
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
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const router = useRouter();
  const parts = pathname.split("/").filter(Boolean);
  const isExpandedCadastro = parts[0] === 'cadastro' && (parts[1] === 'pf' || parts[1] === 'pj') && parts.length >= 3;
  const isPanelOpen = (search?.get('panel') || '').toLowerCase() === 'tarefas';
  const sidebarOffset = isDesktop ? (open ? 300 : 60) : 0;

  // Do not force open the sidebar automatically when opening the Tasks drawer

  function onDownloadPdf() { try { window.print(); } catch {} }
  function onClosePage() { try { window.close(); } catch {} try { history.back(); } catch {} }

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <RouteBg>
      <SidebarProvider open={open} setOpen={setOpen}>
        <div className="text-zinc-900 min-h-screen" style={{ backgroundColor: 'var(--color-primary)' }}>
          <Sidebar open={open} setOpen={setOpen}>
            <AppSidebar />
          </Sidebar>
          <div 
            className="flex flex-1 transition-all duration-300 ease-in-out"
            style={{ 
              marginLeft: isDesktop ? `${open ? 300 : 60}px` : '0px',
            }}
          >
            <main className={`p-2 md:p-6 rounded-tl-3xl border border-neutral-200 dark:border-neutral-700 bg-[var(--neutro)] dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full min-h-screen`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <SidebarTrigger className="hidden md:inline-flex" />
                  <Breadcrumbs />
                </div>
                {isExpandedCadastro && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={onDownloadPdf} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Baixar PDF</button>
                    <button onClick={onClosePage} aria-label="Fechar" className="p-2 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {children}
              {isPanelOpen && (
                <div
                  className="fixed z-[85] bg-transparent"
                  style={{ top: 0, bottom: 0, left: sidebarOffset, right: 0 }}
                  onClick={()=>{ const p=new URLSearchParams(search?.toString()||''); p.delete('panel'); router.replace(`${pathname}${p.size?`?${p}`:''}`); }}
                />
              )}
            </main>
            {isPanelOpen && (
              <div role="dialog" aria-modal className="fixed top-0 z-[90] h-screen bg-[var(--neutro)] border border-neutral-200 rounded-tl-3xl flex flex-col shadow-[4px_0_12px_rgba(0,0,0,0.12)]"
                   style={{ left: sidebarOffset, right: isDesktop ? 'auto' as any : 0, width: isDesktop ? 440 : '100%' }}>
                <div className="px-3 md:px-4 py-2 md:py-3 border-b border-neutral-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <SidebarTrigger className="hidden md:inline-flex" />
                    <span className="text-h4 font-semibold text-[var(--color-primary)] truncate">Minhas Tarefas</span>
                  </div>
                  <button onClick={()=>{ const p=new URLSearchParams(search?.toString()||''); p.delete('panel'); router.replace(`${pathname}${p.size?`?${p}`:''}`); }} aria-label="Fechar" className="p-2 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-3 md:p-4">
                  <TasksPanelProxy />
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarProvider>
    </RouteBg>
  );
}

 
