"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/features/inbox/types";

// Reutilizar as funções do NotificationCard
function getNotificationSymbol(item: InboxItem) {
  if (item.type === "mention" || item.type === "parecer_reply" || item.type === "comment_reply" || item.type === "comment") return "💬";
  if (item.type === "ass_app") return "📱";
  if (item.type === "fichas_atrasadas") return "⏰";
  return "🔔";
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function getNotificationData(item: InboxItem) {
  const meta = item.meta || {};
  const authorName = normalizeName(item.author_name) || normalizeName(meta.author_name) || normalizeName(meta.full_name);
  const candidateNames = [item.primary_name, meta.primary_name, meta.applicant_name, meta.card_title, meta.card_name, meta.applicant, meta.primaryName, meta.applicantPrimaryName];
  const primaryName = candidateNames.map(normalizeName).find(Boolean) || "";
  const subtitleTarget = primaryName || "—";
  const sample = meta.sample || meta.content_preview || "";

  let subtitle = "";
  if (item.type === "mention") {
    subtitle = `Mencionou você em – ${subtitleTarget}`;
  } else if (item.type === "parecer_reply" || (String(item.type) === "comment" && (meta.is_parecer_reply || item.title?.includes("parecer")))) {
    subtitle = `Respondeu seu parecer – ${subtitleTarget}`;
  } else if (item.type === "comment_reply" || (String(item.type) === "comment" && (meta.is_comment_reply || item.title?.includes("comentário")))) {
    subtitle = `Respondeu seu comentário – ${subtitleTarget}`;
  } else if (item.type === "ass_app") {
    subtitle = `Ass App – ${subtitleTarget}`;
  } else if (item.type === "fichas_atrasadas") {
    subtitle = primaryName ? `Fichas atrasadas – ${subtitleTarget}` : "Fichas atrasadas";
  } else {
    subtitle = item.title || "Nova notificação";
  }

  return {
    authorName,
    subtitle,
    sample: sample ? sample.substring(0, 150) + (sample.length > 150 ? "..." : "") : null,
    primaryName: subtitleTarget,
  };
}

function buildPreviewText(item: InboxItem, fallbackSample?: string | null): string {
  const raw = (item.content || item.body || fallbackSample || "Nova notificação") as string;
  const max = 180;
  const clean = String(raw);
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

interface ToastNotificationProps {
  item: InboxItem;
  onDismiss: () => void;
  onClick: () => void;
  onRevealNext?: () => void; // Novo: callback para revelar próximo toast
  isFrontToast?: boolean; // Novo: indica se é o toast da frente
}

export function ToastNotification({ item, onDismiss, onClick, onRevealNext, isFrontToast = false }: ToastNotificationProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasRevealedNextRef = useRef(false); // Evitar múltiplas revelações

  const when = item.created_at ? new Date(item.created_at).toLocaleString() : "";
  const icon = getNotificationSymbol(item);
  const isRead = !!item.read_at;
  const notificationData = getNotificationData(item);
  const preview = buildPreviewText(item, notificationData.sample);

  // Auto-dismiss após 4 segundos
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onDismiss]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    hasRevealedNextRef.current = false; // Reset ao começar novo arraste
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Se arrastou mais de 100px, fecha o toast
    if (distance > 100) {
      onDismiss();
      return;
    }

    // Se é o toast da frente e arrastou para a esquerda (revelar próximo)
    if (isFrontToast && onRevealNext && !hasRevealedNextRef.current) {
      // Se arrastou mais de 50px para a esquerda, revelar próximo
      if (deltaX < -50 && Math.abs(deltaY) < 30) {
        hasRevealedNextRef.current = true;
        onRevealNext();
        // Resetar posição após revelar
        setTimeout(() => {
          setDragOffset({ x: 0, y: 0 });
          setIsDragging(false);
        }, 100);
        return;
      }
    }

    setDragOffset({ x: deltaX, y: deltaY });
  }, [onDismiss, onRevealNext, isFrontToast]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Se não revelou próximo e não fechou, voltar à posição original
    if (!hasRevealedNextRef.current) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClick = () => {
    if (!isDragging && Math.abs(dragOffset.x) < 10 && Math.abs(dragOffset.y) < 10) {
      onClick();
    }
  };

  // LEI 1: Tamanho Fixo - Altura fixa de 180px, largura 100% (380px do container)
  return (
    <Card
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        "relative flex h-[180px] w-full select-none flex-col justify-between rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-lg transition-shadow overflow-hidden",
        isDragging && "shadow-xl cursor-grabbing"
      )}
      style={{
        cursor: isDragging ? "grabbing" : "pointer",
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
      }}
      data-dragging={isDragging}
    >
      <div className="flex items-start justify-between gap-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none flex-shrink-0">{icon}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-zinc-900 truncate">
              {notificationData.authorName || "—"}
            </span>
            <span className="text-[10px] text-zinc-600 truncate">
              {notificationData.subtitle}
            </span>
          </div>
        </div>
        {when && <span className="text-[9px] text-zinc-500 flex-shrink-0">{when}</span>}
      </div>

      <div
        className={cn(
          "rounded-lg border px-2 py-2 text-xs transition-all duration-200 flex-1 min-h-0 overflow-hidden",
          isRead ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-blue-200 bg-blue-50 text-blue-900"
        )}
      >
        <div className={cn("break-words leading-relaxed line-clamp-4", isRead ? "text-white" : "text-blue-900")}>{preview}</div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 flex-shrink-0">
        <span>
          {isFrontToast && onRevealNext ? "Arraste para ver próximo" : "Arraste para fechar"}
        </span>
        <span className="font-medium text-[var(--color-primary)]">Clique para abrir</span>
      </div>
    </Card>
  );
}

