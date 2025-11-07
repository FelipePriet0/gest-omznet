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
  type CSSProperties,
} from "react";
import {
  Inbox as InboxIcon,
  AtSign,
  ClipboardList,
  ListFilter,
  MessageCircle,
  MessageSquare,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { listInbox, markRead, type InboxItem } from "@/features/inbox/services";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";

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

  const filteredItems = useMemo(() => {
    if (!filterType) return items;
    const needle = inboxFilterLabels[filterType].toLowerCase();
    return items.filter((item) => {
      const haystack = `${item.title ?? ""} ${item.body ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [items, filterType]);

  const handleDismiss = useCallback(
    async (id: string) => {
      try {
        await markRead(id);
      } catch {}
      try {
        await refresh();
      } catch {}
    },
    [refresh]
  );

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 z-10">
        <div className="flex items-center gap-2">
          <InboxFilterCTA value={filterType} onSelect={(next) => setFilterType(next)} />
          {filterType && (
            <div
              className="inline-flex items-center gap-2 rounded-none px-3 py-1 text-white shadow-sm text-xs"
              style={{
                backgroundColor: "var(--color-primary)",
                border: "1px solid var(--color-primary)",
              }}
            >
              <span className="font-semibold">Tipo</span>
              <span className="font-medium">{inboxFilterLabels[filterType]}</span>
              <button
                onClick={() => setFilterType(null)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-none text-white transition"
                style={{
                  backgroundColor: "var(--color-primary)",
                  border: "1px solid transparent",
                }}
                aria-label="Limpar filtro da inbox"
                type="button"
              >
                <X className="h-3 w-3" />
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
        {filteredItems.length === 0 ? (
          <div className="rounded border border-zinc-200 bg-white px-3 py-4 text-sm text-zinc-600">
            Sem notificações
          </div>
        ) : (
          <InboxNotificationsStack items={filteredItems} onDismiss={handleDismiss} />
        )}
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

const OFFSET_FACTOR = 4;
const SCALE_FACTOR = 0.03;
const OPACITY_FACTOR = 0.1;

function InboxNotificationsStack({ items, onDismiss }: { items: InboxItem[]; onDismiss: (id: string) => void | Promise<void> }) {
  const cards = items;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const router = useRouter();
  const lastDragOffset = useRef<Record<string, number>>({});

  if (!cards.length) {
    return null;
  }

  return (
    <div className="px-2 pb-3 pt-3">
      <div className="flex flex-col gap-3">
        {cards.map((item) => (
          <motion.div
            key={item.id}
            className="w-full"
            drag="x"
            dragElastic={0.6}
            dragMomentum={false}
            data-dragging={draggingId === item.id}
            whileDrag={{ scale: 1.02, rotate: 0.5 }}
            onDragStart={() => {
              setDraggingId(item.id);
              lastDragOffset.current[item.id] = 0;
            }}
            onDrag={(_, info) => {
              lastDragOffset.current[item.id] = info.offset.x;
            }}
            onDragEnd={(_, info) => {
              setDraggingId(null);
              const offset = info.offset.x;
              if (Math.abs(offset) > 90) {
                void onDismiss(item.id);
              }
            }}
            onClick={() => {
              if (draggingId) return;
              if (Math.abs(lastDragOffset.current[item.id] ?? 0) > 8) return;
              if (item.link_url) {
                try {
                  router.push(item.link_url);
                } catch {
                  window.open(item.link_url, "_blank");
                }
              }
            }}
          >
            <NotificationCard
              item={item}
              active={false}
              dragging={draggingId === item.id}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NotificationCard({ item, active, dragging }: { item: InboxItem; active: boolean; dragging: boolean }) {
  const when = item.created_at ? new Date(item.created_at).toLocaleString() : "";
  const icon = getNotificationSymbol(item);

  return (
    <Card
      className={cn(
        "relative flex h-full min-h-[200px] select-none flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm transition-shadow",
        active && "shadow-md",
        dragging && "shadow-lg"
      )}
      data-dragging={dragging}
      data-active={active}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{icon}</span>
          <span className="line-clamp-1 text-sm font-semibold text-zinc-900">
            {item.title || "Notificação"}
          </span>
        </div>
        {when && <span className="text-[11px] text-zinc-500">{when}</span>}
      </div>
      {item.body && (
        <p className="mt-3 line-clamp-4 text-sm leading-5 text-zinc-700">
          {item.body}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Arraste para marcar como lida</span>
        {item.link_url && <span className="font-medium text-[var(--color-primary)]">Clique para abrir</span>}
      </div>
    </Card>
  );
}

function getNotificationSymbol(item: InboxItem) {
  if (item.type === "task") return "📋";
  if (item.type === "comment") return "💬";
  if (item.type === "card") return "🔥";
  return "🔔";
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

