"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/features/inbox/types";
import {
  getNotificationSymbol,
  getNotificationData,
  buildPreviewText,
} from "./notification-helpers";

export function NotificationCard({
  item,
  active,
  dragging,
}: {
  item: InboxItem;
  active: boolean;
  dragging: boolean;
}) {
  const when = item.created_at
    ? new Date(item.created_at).toLocaleString()
    : "";
  const icon = getNotificationSymbol(item);
  const isRead = !!item.read_at;
  const data = getNotificationData(item);
  const preview = buildPreviewText(item, data.sample);

  return (
    <Card
      className={cn(
        "relative flex select-none flex-col rounded-xl border bg-white p-4 text-sm transition-shadow",
        isRead ? "border-zinc-100" : "border-zinc-200",
        active && "shadow-md",
        dragging && "shadow-lg",
      )}
      data-dragging={dragging}
      data-active={active}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none flex-shrink-0">{icon}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-zinc-900 truncate">
              {data.authorName || "—"}
            </span>
            <span className="text-xs text-zinc-500 truncate">
              {data.subtitle}
            </span>
          </div>
        </div>
        {when && (
          <span className="text-[10px] text-zinc-400 flex-shrink-0 whitespace-nowrap">
            {when}
          </span>
        )}
      </div>

      {/* Preview */}
      <div
        className={cn(
          "rounded-lg px-3 py-2.5 text-[13px] leading-relaxed break-words",
          isRead
            ? "bg-zinc-50 text-zinc-500"
            : "bg-[var(--verde-primario)]/5 text-zinc-700 border border-[var(--verde-primario)]/15",
        )}
      >
        {preview}
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-400">
        <span>Arraste para marcar como lida</span>
        <span className="font-medium text-[var(--verde-primario)]">
          Clique para abrir
        </span>
      </div>
    </Card>
  );
}
