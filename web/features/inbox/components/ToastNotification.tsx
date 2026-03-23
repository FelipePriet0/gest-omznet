"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/features/inbox/types";
import {
  getNotificationSymbol,
  getNotificationData,
  buildPreviewText,
} from "./notification-helpers";

interface ToastNotificationProps {
  item: InboxItem;
  onDismiss: () => void;
  onClick: () => void;
  onRevealNext?: () => void;
  isFrontToast?: boolean;
}

export function ToastNotification({
  item,
  onDismiss,
  onClick,
  onRevealNext,
  isFrontToast = false,
}: ToastNotificationProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasRevealedNextRef = useRef(false);

  const when = item.created_at
    ? new Date(item.created_at).toLocaleString()
    : "";
  const icon = getNotificationSymbol(item);
  const isRead = !!item.read_at;
  const data = getNotificationData(item);
  const preview = buildPreviewText(item, data.sample);

  // Auto-dismiss após 4 segundos
  useEffect(() => {
    timeoutRef.current = setTimeout(onDismiss, 4000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onDismiss]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    hasRevealedNextRef.current = false;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 100) {
        onDismiss();
        return;
      }

      if (
        isFrontToast &&
        onRevealNext &&
        !hasRevealedNextRef.current &&
        deltaX < -50 &&
        Math.abs(deltaY) < 30
      ) {
        hasRevealedNextRef.current = true;
        onRevealNext();
        setTimeout(() => {
          setDragOffset({ x: 0, y: 0 });
          setIsDragging(false);
        }, 100);
        return;
      }

      setDragOffset({ x: deltaX, y: deltaY });
    },
    [onDismiss, onRevealNext, isFrontToast],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (!hasRevealedNextRef.current) setDragOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClick = () => {
    if (
      !isDragging &&
      Math.abs(dragOffset.x) < 10 &&
      Math.abs(dragOffset.y) < 10
    )
      onClick();
  };

  return (
    <Card
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        "relative flex h-[180px] w-full select-none flex-col justify-between rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-lg transition-shadow overflow-hidden",
        isDragging && "shadow-xl cursor-grabbing",
      )}
      style={{
        cursor: isDragging ? "grabbing" : "pointer",
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
      }}
      data-dragging={isDragging}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none flex-shrink-0">{icon}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-zinc-900 truncate">
              {data.authorName || "—"}
            </span>
            <span className="text-[10px] text-zinc-500 truncate">
              {data.subtitle}
            </span>
          </div>
        </div>
        {when && (
          <span className="text-[9px] text-zinc-400 flex-shrink-0">
            {when}
          </span>
        )}
      </div>

      {/* Preview */}
      <div
        className={cn(
          "rounded-lg px-2.5 py-2 text-xs transition-all duration-200 flex-1 min-h-0 overflow-hidden leading-relaxed break-words line-clamp-4",
          isRead
            ? "bg-zinc-50 text-zinc-500"
            : "bg-[var(--verde-primario)]/5 text-zinc-700 border border-[var(--verde-primario)]/15",
        )}
      >
        {preview}
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 flex-shrink-0">
        <span>
          {isFrontToast && onRevealNext
            ? "Arraste para ver próximo"
            : "Arraste para fechar"}
        </span>
        <span className="font-medium text-[var(--verde-primario)]">
          Clique para abrir
        </span>
      </div>
    </Card>
  );
}
