"use client";

import clsx from "clsx";

export const DECISION_META: Record<string, { label: string; className: string }> = {
  aprovado: { label: "Aprovado", className: "decision-chip--primary" },
  negado: { label: "Negado", className: "decision-chip--destructive" },
  reanalise: { label: "Reanálise", className: "decision-chip--warning" },
};

export function decisionPlaceholder(decision: string | null | undefined) {
  return decision ? `[decision:${decision}]` : "";
}

export function DecisionTag({ decision }: { decision?: string | null }) {
  if (!decision) return null;
  const meta = DECISION_META[decision];
  if (!meta) return null;
  return <span className={clsx("decision-chip", meta.className)}>{meta.label}</span>;
}

