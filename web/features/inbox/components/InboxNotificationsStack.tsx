"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { InboxItem } from "@/features/inbox/types";
import { NotificationCard } from "./NotificationCard";

export function InboxNotificationsStack({ items, onDismiss }: { items: InboxItem[]; onDismiss: (id: string) => void | Promise<void> }) {
  const cards = items;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const router = useRouter();
  const lastDragOffset = useRef<Record<string, number>>({});

  if (!cards.length) return null;

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
              if (Math.abs(offset) > 90) void onDismiss(item.id);
            }}
            onClick={() => {
              if (draggingId) return;
              if (Math.abs(lastDragOffset.current[item.id] ?? 0) > 8) return;
              // Abrir sempre o modal EditarFicha do card quando houver card_id
              const url = item.card_id
                ? `/kanban/analise?card=${item.card_id}`
                : (item.link_url || null);
              if (!url) return;
              try {
                router.push(url);
              } catch {
                try { window.open(url, "_blank"); } catch {}
              }
            }}
          >
            <NotificationCard item={item} active={false} dragging={draggingId === item.id} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
