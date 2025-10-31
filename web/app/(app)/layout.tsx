"use client";

import { useState, useEffect } from "react";
import RouteBg from "./RouteBg";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { LayoutGrid, CheckSquare, History, UserCircle } from "lucide-react";
import { Logo, LogoIcon } from "@/components/app/sidebar-logo";
import { SidebarUser } from "@/components/app/sidebar-user";
import { motion } from "framer-motion";

function SidebarContent() {
  const { open } = useSidebar();

  const links = [
    {
      label: "Kanban",
      href: "/kanban",
      icon: <LayoutGrid className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />,
    },
    {
      label: "Minhas Tarefas",
      href: "/tarefas",
      icon: <CheckSquare className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />,
    },
    {
      label: "Histórico",
      href: "/historico",
      icon: <History className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />,
    },
    {
      label: "Meu Perfil",
      href: "/perfil",
      icon: <UserCircle className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />,
    },
  ];

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {open ? <Logo /> : <LogoIcon />}
        <div className="mt-8 flex flex-col gap-2">
          {links.map((link, idx) => (
            <SidebarLink key={idx} link={link} />
          ))}
        </div>
      </div>
      <motion.div
        animate={{
          display: open ? "block" : "none",
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        <SidebarUser name="Usuário" email="usuario@mznet.com" />
      </motion.div>
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
      <div className="text-zinc-900 min-h-screen bg-neutral-100 dark:bg-neutral-800">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarContent />
        </Sidebar>
        <div 
          className="flex flex-1 transition-all duration-300 ease-in-out"
          style={{ 
            marginLeft: isDesktop ? `${open ? 300 : 80}px` : '0px',
          }}
        >
          <main className="p-2 md:p-6 rounded-tl-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full min-h-screen overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </RouteBg>
  );
}
 
