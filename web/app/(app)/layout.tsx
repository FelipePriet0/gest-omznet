"use client";

import { useState, useEffect } from "react";
import RouteBg from "./RouteBg";
import { Sidebar, SidebarBody, SidebarLink, useSidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { LayoutGrid, CheckSquare, History, UserCircle } from "lucide-react";
import Image from "next/image";
import { SidebarUser } from "@/components/app/sidebar-user";
import { motion } from "framer-motion";

function AppSidebar() {
  const { open } = useSidebar();

  const links = [
    {
      label: "Kanban",
      href: "/kanban",
      icon: <LayoutGrid className="h-5 w-5 text-white flex-shrink-0" />,
    },
    {
      label: "Minhas Tarefas",
      href: "/tarefas",
      icon: <CheckSquare className="h-5 w-5 text-white flex-shrink-0" />,
    },
    {
      label: "Histórico",
      href: "/historico",
      icon: <History className="h-5 w-5 text-white flex-shrink-0" />,
    },
    {
      label: "Meu Perfil",
      href: "/perfil",
      icon: <UserCircle className="h-5 w-5 text-white flex-shrink-0" />,
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
            <main className="p-2 md:p-6 rounded-tl-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full min-h-screen overflow-auto">
              <div className="mb-2">
                <SidebarTrigger className="hidden md:inline-flex" />
              </div>
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RouteBg>
  );
}
 
