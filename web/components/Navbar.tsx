'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  LayoutGrid,
  CheckSquare,
  History,
  UserCircle,
} from 'lucide-react';

import { Dock, DockIcon, DockItem, DockLabel } from '@/components/ui/dock';

const navItems = [
  {
    title: 'Kanban',
    icon: <LayoutGrid className='h-5 w-5 text-zinc-600' />,
    href: '/kanban',
  },
  {
    title: 'Minhas Tarefas',
    icon: <CheckSquare className='h-5 w-5 text-zinc-600' />,
    href: '/tarefas',
  },
  {
    title: 'Histórico',
    icon: <History className='h-5 w-5 text-zinc-600' />,
    href: '/historico',
  },
  {
    title: 'Meu Perfil',
    icon: <UserCircle className='h-5 w-5 text-zinc-600' />,
    href: '/perfil',
  },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className='fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-full'>
      <Dock className='items-end pb-3'>
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <div key={idx} onClick={() => handleNavigation(item.href)}>
              <DockItem
                className={`aspect-square rounded-full cursor-pointer transition-colors ${
                  isActive 
                    ? 'bg-emerald-600' 
                    : 'bg-zinc-100 hover:bg-zinc-200'
                }`}
              >
                <DockLabel>{item.title}</DockLabel>
                <DockIcon>
                  <div className={isActive ? 'text-white' : ''}>
                    {item.icon}
                  </div>
                </DockIcon>
              </DockItem>
            </div>
          );
        })}
      </Dock>
    </div>
  );
}

