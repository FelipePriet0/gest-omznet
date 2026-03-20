"use client";

import { CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { ScheduleCard } from "../types";

// ── Derivar stage/situação a partir de area + stage ──────────────────────
type StageMeta = { label: string; bg: string; text: string; border: string };

function getStageMeta(card: ScheduleCard): StageMeta {
  const area  = (card.area  || "").toLowerCase();
  const stage = (card.stage || "").toLowerCase();

  if (area === "comercial")          return { label: "Comercial",   bg: "bg-indigo-100",  text: "text-indigo-700",  border: "border-l-indigo-500"  };
  if (stage === "aprovados")         return { label: "Aprovado",    bg: "bg-emerald-100", text: "text-emerald-700", border: "border-l-emerald-500" };
  if (stage === "negados")           return { label: "Negado",      bg: "bg-red-100",     text: "text-red-700",     border: "border-l-red-500"     };
  if (stage === "reanalise")         return { label: "Reanálise",   bg: "bg-orange-100",  text: "text-orange-700",  border: "border-l-orange-500"  };
  if (stage === "em_analise")        return { label: "Em Análise",  bg: "bg-amber-100",   text: "text-amber-700",   border: "border-l-amber-500"   };
  if (stage === "ass_app")           return { label: "Ass App",     bg: "bg-indigo-100",  text: "text-indigo-700",  border: "border-l-indigo-500"  };
  return                                     { label: "Em Análise", bg: "bg-amber-100",   text: "text-amber-700",   border: "border-l-amber-500"   };
}

// ── Card ─────────────────────────────────────────────────────────────────
export function AgendaCard({
  card,
  canEdit,
  onEdit,
  overlay = false,
}: {
  card: ScheduleCard;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void; // mantido para compatibilidade, não exibido aqui
  overlay?: boolean;
}) {
  const disableDrag = !canEdit || card.id.startsWith("tmp-") || overlay;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: disableDrag,
  });

  const style: CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const meta = getStageMeta(card);

  return (
    <div
      ref={setNodeRef}
      {...(!disableDrag ? { ...listeners, ...attributes } : {})}
      style={{ ...style, width: 316, height: 70 }}
      onClick={() => { if (canEdit && !overlay) onEdit(card.id); }}
      className={[
        "group relative rounded-md border-l-4 bg-white shadow-sm overflow-hidden transition",
        "select-none",
        meta.border,
        isDragging ? "opacity-50 ring-2 ring-white/40" : "",
        !overlay && canEdit ? "cursor-grab active:cursor-grabbing hover:shadow-md" : "",
        overlay ? "shadow-xl ring-2 ring-white/30 rotate-1 scale-105" : "",
      ].join(" ")}
    >
      <div className="px-2.5 py-1.5 flex flex-col justify-center gap-0.5 h-full">
        {/* Label: nome do cliente */}
        <span className="block text-[11px] font-semibold text-zinc-800 truncate leading-snug" title={card.cliente}>
          {card.cliente || "—"}
        </span>

        {/* Descrição: plano · bairro */}
        {(card.plano || card.bairro) && (
          <span className="block text-[10px] text-zinc-500 truncate leading-tight">
            {[card.plano, card.bairro].filter(Boolean).join(" · ")}
          </span>
        )}

        {/* Chip de situação */}
        <span className={`inline-flex w-fit items-center rounded-full px-1.5 py-px text-[9px] font-semibold leading-none ${meta.bg} ${meta.text}`}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}
