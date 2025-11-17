"use client";

import { createContext, useCallback, useContext, useState, useMemo, type ReactNode } from "react";
import { Inbox as InboxIcon, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { markRead } from "@/features/inbox/services";
import type { InboxItem, NotificationType, InboxFilterOption } from "@/features/inbox/types";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { InboxFilterCTA, inboxFilterLabelsMap } from "@/features/inbox/components/InboxFilterCTA";
import { InboxNotificationsStack } from "@/features/inbox/components/InboxNotificationsStack";
import { useInboxController } from "@/features/inbox/hooks/useInboxController";

type RefreshHandler = () => Promise<void> | void;

type InboxContextValue = {
  items: InboxItem[];
  unread: number;
  refresh: RefreshHandler;
};

const InboxContext = createContext<InboxContextValue | null>(null);

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

const inboxFilterLabels: Record<InboxFilterOption, string> = {
  mentions: "Menções",
  parecer: "Respostas em parecer",
  comentarios: "Respostas em comentários",
};

export function InboxPanel() {
  const { items, refresh } = useInbox();
  const [filterType, setFilterType] = useState<InboxFilterOption | null>(null);
  const HIDDEN_TYPES: NotificationType[] = ['ass_app', 'fichas_atrasadas'];
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  // Base visível (não lidas, não escondidas e tipos suportados); usada para filtro
  const visibleBase = useMemo(() => {
    return items.filter((it) => !HIDDEN_TYPES.includes(it.type as NotificationType) && !it.read_at && !hiddenIds.has(it.id));
  }, [items, hiddenIds]);

  const filteredItems = useMemo(() => {
    const base = visibleBase;
    if (!filterType) return base;
    const byType = (item: InboxItem, types: NotificationType[]) => types.includes(item.type as NotificationType);
    if (filterType === 'mentions') return base.filter((item) => byType(item, ['mention']));
    if (filterType === 'parecer') return base.filter((item) => byType(item, ['parecer_reply']));
    if (filterType === 'comentarios') return base.filter((item) => byType(item, ['comment_reply']));
    return base;
  }, [visibleBase, filterType]);

  const handleDismiss = useCallback(
    (id: string, navigateTo?: string | null) => {
      // Otimista: esconde imediatamente
      setHiddenIds((prev) => new Set(prev).add(id));
      // Marca como lida em background
      (async () => {
        try { await markRead(id); } catch {}
        // Aguarda a animação de saída (≈ 220ms) antes de sincronizar para evitar "solavanco"
        setTimeout(() => { void refresh(); }, 280);
      })();
      // Navega se solicitado
      if (navigateTo) {
        try { (window as any).next?.router?.push?.(navigateTo); } catch {}
        try { window.open(navigateTo, "_self"); } catch {}
      }
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
              <span className="font-medium">{inboxFilterLabelsMap[filterType]}</span>
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
// Components foram extraídos para arquivos dedicados em ./components
