"use client";

import { CSSProperties, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { ScheduleCard } from "../types";

function statusColor(status: ScheduleCard["status"]): string {
  switch (status) {
    case "aprovado":
      return "#10b981"; // emerald-500
    case "reanalise":
      return "#f59e0b"; // amber-500
    case "mudanca_endereco":
      return "#facc15"; // yellow-400
    default:
      return "#9ca3af"; // gray-400
  }
}

export function AgendaCard({ card, canEdit, onEdit, onDelete }: { card: ScheduleCard; canEdit: boolean; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, disabled: !canEdit });
  const style: CSSProperties | undefined = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      {...(canEdit ? { ...listeners, ...attributes } : {})}
      style={style}
      className={`group rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white shadow-sm transition hover:bg-white/10 ${isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold truncate" title={card.cliente}>{card.cliente}</div>
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(card.status) }} />
      </div>
      <div className="text-white/80 truncate">{card.bairro || "-"}</div>
      <div className="text-white/60 truncate">{card.tipo_instalacao || "-"}</div>
      {canEdit && (
        <div className="mt-2 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
          <button onClick={() => onEdit(card.id)} className="btn-small-secondary">Editar</button>
          <button onClick={() => onDelete(card.id)} className="btn-small-secondary">Excluir</button>
        </div>
      )}
    </div>
  );
}
