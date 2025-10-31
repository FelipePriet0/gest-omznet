"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { LayoutGrid, CheckSquare, History, UserCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("U");
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .single();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
          const names = profile.full_name.split(" ");
          if (names.length > 1) {
            setUserInitials((names[0][0] + names[1][0]).toUpperCase());
          } else {
            setUserInitials(names[0][0].toUpperCase());
          }
        }
      }
    };
    fetchUser();
  }, []);

  const links = [
    {
      label: "Kanban",
      href: "/kanban",
      icon: (
        <LayoutGrid className={`h-5 w-5 flex-shrink-0 ${pathname === '/kanban' ? 'text-emerald-600' : 'text-zinc-700'}`} />
      ),
    },
    {
      label: "Minhas Tarefas",
      href: "/tarefas",
      icon: (
        <CheckSquare className={`h-5 w-5 flex-shrink-0 ${pathname === '/tarefas' ? 'text-emerald-600' : 'text-zinc-700'}`} />
      ),
    },
    {
      label: "Histórico",
      href: "/historico",
      icon: (
        <History className={`h-5 w-5 flex-shrink-0 ${pathname === '/historico' ? 'text-emerald-600' : 'text-zinc-700'}`} />
      ),
    },
    {
      label: "Meu Perfil",
      href: "/perfil",
      icon: (
        <UserCircle className={`h-5 w-5 flex-shrink-0 ${pathname === '/perfil' ? 'text-emerald-600' : 'text-zinc-700'}`} />
      ),
    },
  ];

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>
        <div>
          <SidebarLink
            link={{
              label: userName || "Usuário",
              href: "/perfil",
              icon: (
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
                  {userInitials}
                </div>
              ),
            }}
          />
        </div>
      </SidebarBody>
    </Sidebar>
  );
}

export const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <Image 
        src="/mznet-logo.png" 
        alt="MZNET Logo" 
        width={24} 
        height={24}
        className="flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-emerald-600 whitespace-pre"
      >
        MZNET
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <Image 
        src="/mznet-logo.png" 
        alt="MZNET Logo" 
        width={24} 
        height={24}
        className="flex-shrink-0"
      />
    </Link>
  );
};

