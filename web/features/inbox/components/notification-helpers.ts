import type { InboxItem } from "@/features/inbox/types";

export function getNotificationSymbol(item: InboxItem) {
  if (
    item.type === "mention" ||
    item.type === "parecer_reply" ||
    item.type === "comment"
  )
    return "💬";
  if (item.type === "ass_app") return "📱";
  if (item.type === "fichas_atrasadas") return "⏰";
  return "🔔";
}

export function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

export function getNotificationData(item: InboxItem) {
  const meta = item.meta || {};
  const authorName =
    normalizeName(item.author_name) ||
    normalizeName(meta.author_name) ||
    normalizeName(meta.full_name);

  const candidateNames = [
    item.primary_name,
    meta.primary_name,
    meta.applicant_name,
    meta.card_title,
    meta.card_name,
    meta.applicant,
    meta.primaryName,
    meta.applicantPrimaryName,
  ];
  const primaryName = candidateNames.map(normalizeName).find(Boolean) || "";
  const subtitleTarget = primaryName || "—";
  const sample = meta.sample || meta.content_preview || "";

  let subtitle = "";
  if (item.type === "mention") {
    subtitle = `Mencionou você em – ${subtitleTarget}`;
  } else if (
    item.type === "parecer_reply" ||
    (String(item.type) === "comment" &&
      (meta.is_parecer_reply || item.title?.includes("parecer")))
  ) {
    subtitle = `Respondeu seu parecer – ${subtitleTarget}`;
  } else if (item.type === "ass_app") {
    subtitle = `Ass App – ${subtitleTarget}`;
  } else if (item.type === "fichas_atrasadas") {
    subtitle = primaryName
      ? `Fichas atrasadas – ${subtitleTarget}`
      : "Fichas atrasadas";
  } else {
    subtitle = item.title || "Nova notificação";
  }

  return {
    authorName,
    subtitle,
    sample: sample
      ? sample.substring(0, 150) + (sample.length > 150 ? "..." : "")
      : null,
    primaryName: subtitleTarget,
  };
}

export function buildPreviewText(
  item: InboxItem,
  fallbackSample?: string | null,
): string {
  const raw = (item.content ||
    item.body ||
    fallbackSample ||
    "Nova notificação") as string;
  const max = 180;
  const clean = String(raw);
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}
