"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { KanbanCard as Card } from "@/features/kanban/types";

export function KanbanCard({ card, onOpen, onMenu }: { card: Card; onOpen: () => void; onMenu: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
    rotate: isDragging ? "2deg" : undefined,
    boxShadow: isDragging ? "0 10px 20px rgba(0,0,0,0.3)" : undefined,
    opacity: isDragging ? 0.95 : 1,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="kanban-card rounded-md border border-zinc-200 bg-white p-3 text-sm transition">
      <div className="flex items-start justify-between">
        <div className="min-w-0" onClick={onOpen} role="button">
          <div className="mb-1 truncate text-sm font-semibold">{card.applicantName}</div>
          <div className="text-xs text-zinc-500">{card.cpfCnpj}</div>
        </div>
        <button onClick={onMenu} className="ml-2 rounded p-1 text-red-500 hover:bg-red-50" aria-label="menu">
          ⋮
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
        {card.phone && <span>Tel: {card.phone}</span>}
        {card.whatsapp && <span>Whats: {card.whatsapp}</span>}
        {card.bairro && <span>Bairro: {card.bairro}</span>}
        {card.dueAt && <span>Ag.: {new Date(card.dueAt).toLocaleDateString()}</span>}
      </div>
      {card.extraAction}
      <div className="mt-2 flex gap-2">
        <button className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs" {...listeners} {...attributes}>
          Arrastar
        </button>
      </div>
    </div>
  );
}

