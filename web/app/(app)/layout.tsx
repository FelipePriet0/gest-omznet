import RouteBg from "./RouteBg";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { LayoutGrid, CheckSquare, History, UserCircle } from "lucide-react";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RouteBg>
      <div className="text-zinc-900 flex min-h-dvh">
        <Sidebar>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              <div className="mt-2 flex flex-col gap-2">
                <SidebarLink link={{ label: "Kanban", href: "/kanban", icon: <LayoutGrid className="h-5 w-5 text-zinc-700" /> }} />
                <SidebarLink link={{ label: "Minhas Tarefas", href: "/tarefas", icon: <CheckSquare className="h-5 w-5 text-zinc-700" /> }} />
                <SidebarLink link={{ label: "Histórico", href: "/historico", icon: <History className="h-5 w-5 text-zinc-700" /> }} />
                <SidebarLink link={{ label: "Meu Perfil", href: "/perfil", icon: <UserCircle className="h-5 w-5 text-zinc-700" /> }} />
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
        <main className="flex-1 mx-auto max-w-6xl px-6 py-6">{children}</main>
      </div>
    </RouteBg>
  );
}
 
