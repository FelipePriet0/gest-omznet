'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  CheckSquare,
  History,
  UserCircle,
} from 'lucide-react';

import { Dock, DockIcon, DockItem, DockLabel } from '@/components/ui/dock';
import { cn } from '@/lib/utils';

const navItems = [
  {
    title: 'Kanban',
    Icon: LayoutGrid,
    href: '/kanban',
  },
  {
    title: 'Minhas Tarefas',
    Icon: CheckSquare,
    href: '/tarefas',
  },
  {
    title: 'Histórico',
    Icon: History,
    href: '/historico',
  },
  {
    title: 'Meu Perfil',
    Icon: UserCircle,
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
          const Icon = item.Icon;
          return (
            <div key={idx} onClick={() => handleNavigation(item.href)}>
              <DockItem
                className={cn(
                  'group aspect-square cursor-pointer rounded-[6px] transition-colors',
                  isActive
                    ? 'bg-primary'
                    : 'bg-zinc-100 hover:bg-primary focus-visible:bg-primary'
                )}
              >
                <DockLabel>{item.title}</DockLabel>
                <DockIcon>
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-colors',
                      isActive
                        ? 'text-white'
                        : 'text-zinc-600 group-hover:text-white group-focus:text-white'
                    )}
                  />
                </DockIcon>
              </DockItem>
            </div>
          );
        })}
      </Dock>
    </div>
  );
}

