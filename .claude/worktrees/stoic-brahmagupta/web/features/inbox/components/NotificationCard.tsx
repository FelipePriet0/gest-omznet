"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/features/inbox/types";

export function NotificationCard({ item, active, dragging }: { item: InboxItem; active: boolean; dragging: boolean }) {
  const when = item.created_at ? new Date(item.created_at).toLocaleString() : "";
  const icon = getNotificationSymbol(item);
  const isRead = !!item.read_at;
  const notificationData = getNotificationData(item);
  const preview = buildPreviewText(item, notificationData.sample);

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
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{icon}</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-900">
              {notificationData.authorName || "—"}
            </span>
            <span className="text-xs text-zinc-600">
              {notificationData.subtitle}
            </span>
          </div>
        </div>
        {when && <span className="text-[11px] text-zinc-500">{when}</span>}
      </div>

      <div
        className={cn(
          "rounded-lg border px-3 py-2 text-sm transition-all duration-200",
          isRead ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-blue-200 bg-blue-50 text-blue-900"
        )}
      >
        <div className={cn("break-words leading-relaxed", isRead ? "text-white" : "text-blue-900")}>{preview}</div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Arraste para marcar como lida</span>
        {item.link_url && <span className="font-medium text-[var(--color-primary)]">Clique para abrir</span>}
      </div>
    </Card>
  );
}

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
  // Usar item.author_name primeiro (vem diretamente da RPC), depois meta como fallback
  const authorName = normalizeName(item.author_name) || normalizeName(meta.author_name) || normalizeName(meta.full_name);
  // Usar item.primary_name primeiro (vem diretamente da RPC), depois meta como fallback
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

