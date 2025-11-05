"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Inbox as InboxIcon,
  AtSign,
  ClipboardList,
  ListFilter,
  MessageCircle,
  MessageSquare,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { listInbox, markRead, type InboxItem } from "@/features/inbox/services";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, PanInfo } from "framer-motion";

type RefreshHandler = () => Promise<void> | void;

type InboxContextValue = {
  items: InboxItem[];
  unread: number;
  refresh: RefreshHandler;
};

const InboxContext = createContext<InboxContextValue | null>(null);

function useInboxController(panelOpen: boolean) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const unread = useMemo(() => items.filter((i) => !i.read_at).length, [items]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await listInbox();
      if (mountedRef.current) {
        setItems(next);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        const userId = data.user?.id ?? null;
        setUid(userId);
        if (userId) {
          await refresh();
        } else {
          setItems([]);
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`inbox-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inbox_notifications", filter: `user_id=eq.${uid}` },
        () => {
          void refresh();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid, refresh]);

  useEffect(() => {
    if (panelOpen) {
      void refresh();
    }
  }, [panelOpen, refresh]);

  return { items, unread, refresh } as const;
}

export function InboxProvider({ children, panelOpen }: { children: ReactNode; panelOpen: boolean }) {
  const value = useInboxController(panelOpen);
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error("useInbox must be used within an InboxProvider");
  }
  return context;
}

export function InboxSidebarEntry() {
  const { open: sidebarOpen } = useSidebar();
  const { unread } = useInbox();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const panel = (search?.get("panel") || "").toLowerCase();
  const isActive = panel === "inbox";

  const unreadLabel = unread > 99 ? "99+" : String(unread);

  const handleOpen = () => {
    const params = new URLSearchParams(search?.toString() ?? "");
    params.set("panel", "inbox");
    const query = params.size ? `?${params.toString()}` : "";
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={handleOpen}
      className={cn(
        "group/sidebar flex w-full items-center rounded-[5px] border border-transparent bg-white/0 p-3 text-left text-sm text-white transition-colors hover:bg-neutral-200/60",
        sidebarOpen ? "justify-between gap-2" : "justify-center",
        isActive && "bg-neutral-200/80 text-[var(--color-primary)]"
      )}
    >
      <div className={cn("flex items-center", sidebarOpen ? "gap-2" : "relative")}
      >
        <div className="relative">
          <InboxIcon className={cn("h-5 w-5", isActive ? "text-[var(--color-primary)]" : "text-white")} />
          {!sidebarOpen && unread > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
        </div>
        {sidebarOpen && (
          <span
            className={cn(
              "whitespace-pre transition duration-150 group-hover/sidebar:translate-x-1",
              isActive ? "text-[var(--color-primary)]" : "text-white"
            )}
          >
            Caixa de entrada
          </span>
        )}
      </div>
      {sidebarOpen && unread > 0 && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            isActive ? "bg-[var(--color-primary)] text-white" : "bg-red-600 text-white"
          )}
        >
          {unreadLabel}
        </span>
      )}
    </button>
  );
}

type InboxFilterOption = "mentions" | "parecer" | "comentarios";

const inboxFilterLabels: Record<InboxFilterOption, string> = {
  mentions: "Menções",
  parecer: "Respostas em parecer",
  comentarios: "Respostas em comentários",
};

export function InboxPanel() {
  const { items, refresh } = useInbox();
  const [filterType, setFilterType] = useState<InboxFilterOption | null>(null);

  const metrics = [
    {
      key: "parecer",
      title: "Respostas em parecer",
      icon: <MessageCircle className="w-4 h-4 text-white" />,
      value: 0,
    },
    {
      key: "comentarios",
      title: "Respostas em Comentário",
      icon: <MessageSquare className="w-4 h-4 text-white" />,
      value: 0,
    },
    {
      key: "mentions",
      title: "Menções",
      icon: <AtSign className="w-4 h-4 text-white" />,
      value: 0,
    },
    {
      key: "tarefas",
      title: "Tarefas",
      icon: <ClipboardList className="w-4 h-4 text-white" />,
      value: 0,
    },
  ];

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 z-10">
        <div className="flex items-center gap-2">
          <InboxFilterCTA value={filterType} onSelect={(next) => setFilterType(next)} />
          {filterType && (
            <div className="flex gap-[1px] items-center text-xs">
              <div className="flex gap-1.5 shrink-0 rounded-l bg-neutral-200 px-1.5 py-1 items-center">
                Tipo
              </div>
              <div className="bg-neutral-100 px-2 py-1 text-neutral-700">{inboxFilterLabels[filterType]}</div>
              <button
                onClick={() => setFilterType(null)}
                className="bg-neutral-200 rounded-l-none rounded-r-sm h-6 w-6 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-300 transition shrink-0"
                aria-label="Limpar filtro da inbox"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="pt-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 w-full mb-6">
          {metrics.map((metric) => (
            <DashboardCard key={metric.key} title={metric.title} value={metric.value} icon={metric.icon} />
          ))}
        </div>
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">Sem notificações</div>
          ) : (
            items.map((n) => <InboxRow key={n.id} n={n} onRefresh={refresh} />)
          )}
        </div>
      </div>
    </div>
  );
}

function InboxFilterCTA({ value, onSelect }: { value: InboxFilterOption | null; onSelect: (value: InboxFilterOption) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="transition-all duration-200 group h-6 text-xs items-center rounded-sm flex gap-1.5 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ListFilter className="size-3 shrink-0 transition-all text-muted-foreground group-hover:text-neutral-700" />
          Filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-white border-0 shadow-lg rounded-lg">
        <Command className="rounded-lg">
          <CommandList className="p-1">
            <CommandGroup className="p-0">
              {(
                [
                  { value: "mentions", label: inboxFilterLabels.mentions },
                  { value: "parecer", label: inboxFilterLabels.parecer },
                  { value: "comentarios", label: inboxFilterLabels.comentarios },
                ] as const
              ).map((option) => (
                <CommandItem
                  key={option.value}
                  className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1"
                  value={option.label}
                  onSelect={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function InboxRow({ n, onRefresh }: { n: InboxItem; onRefresh: RefreshHandler }) {
  const when = n.created_at ? new Date(n.created_at).toLocaleString() : '';
  const icon = n.type === 'task' ? '📋' : n.type === 'comment' ? '💬' : n.type === 'card' ? '🔥' : '🔔';
  const isUnread = !n.read_at;
  const [isDragging, setIsDragging] = useState(false);

  const cardClasses = `flex items-start gap-3 rounded-xl border px-3 py-2 bg-white transition ${
    isUnread ? 'border-emerald-200 hover:border-emerald-400 hover:shadow' : 'border-zinc-200 hover:border-zinc-300 hover:shadow'
  }`;

  const content = (
    <div className="flex items-start gap-3">
      <div className="text-xl leading-none pt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="truncate text-sm font-semibold">{n.title || 'Notificação'}</div>
          <div className="text-[11px] text-zinc-500">{when}</div>
        </div>
        {n.body && <div className="mt-0.5 text-sm text-zinc-700">{n.body}</div>}
        <div className="mt-2 flex items-center gap-2 text-xs">
          {isUnread && (
            <button
              className="rounded border border-zinc-300 px-2 py-0.5"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await markRead(n.id);
                  await onRefresh();
                } catch {}
              }}
            >
              Marcar como lida
            </button>
          )}
          {/* Placeholder para ações futuras */}
        </div>
      </div>
    </div>
  );

  const handleDragEnd = async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (!isUnread) return;
    if (Math.abs(info.offset.x) > 120) {
      try {
        await markRead(n.id);
        await onRefresh();
      } catch {}
    }
  };

  const commonProps = {
    className: cardClasses,
    drag: "x" as const,
    dragConstraints: { left: 0, right: 0 },
    dragElastic: 0.2,
    onDragStart: () => setIsDragging(true),
    onDragEnd: handleDragEnd,
  };

  if (n.link_url) {
    return (
      <motion.a
        href={n.link_url}
        {...commonProps}
        onClick={(e) => {
          if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.div {...commonProps}>
      {content}
    </motion.div>
  );
}

function DashboardCard({ title, value, icon }: { title: string; value?: number | null; icon?: ReactNode }) {
  return (
    <div className="h-[120px] w-full rounded-[12px] border bg-white border-zinc-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-[#000000] px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-medium text-white">{title}</div>
        {icon && <div className="text-white">{icon}</div>}
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-3xl font-bold text-[var(--verde-primario)]">
          {typeof value === "number" ? value : "—"}
        </div>
      </div>
    </div>
  );
}

