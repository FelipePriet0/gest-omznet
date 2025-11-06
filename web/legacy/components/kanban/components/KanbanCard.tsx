"use client";

import { useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { KanbanCard as Card } from "@/features/kanban/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreVertical, Phone, MessageCircle, MapPin, Calendar } from "lucide-react";

export function KanbanCard({ card, onOpen, onMenu }: { card: Card; onOpen: () => void; onMenu: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    willChange: 'transform, opacity',
    zIndex: isDragging ? 1000 : undefined,
    boxShadow: isDragging ? "0 10px 24px rgba(30,41,59,0.16)" : "0 6px 16px rgba(30,41,59,0.06)",
    opacity: isDragging ? 0.97 : 1,
  } as React.CSSProperties;
  const [menuOpen, setMenuOpen] = useState(false);
  const pressAt = useRef(0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-card rounded-2xl border border-emerald-100/40 bg-white p-3 shadow-[0_6px_16px_rgba(30,41,59,0.06)] hover:shadow-[0_10px_24px_rgba(30,41,59,0.10)] transition"
      onPointerDown={() => { pressAt.current = performance.now(); }}
      onClick={(e) => {
        // Se está arrastando, ou clicou em controle interativo, não abre
        if (isDragging) return;
        const el = e.target as HTMLElement;
        if (el && el.closest('[data-ignore-card-click], [data-action-button], [role="menuitem"], button, a, input, textarea, select, [contenteditable="true"]')) return;
        // Clique válido (não foi convertido em drag pelo sensor de distância)
        onOpen();
      }}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0" role="button">
          <div className="mb-0.5 truncate text-[13px] font-semibold text-zinc-900">{card.applicantName}</div>
          <div className="text-[11px] text-zinc-500">CPF: {card.cpfCnpj}</div>
        </div>
        <div className="flex items-center gap-1">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button className="ml-1 rounded p-1 text-emerald-600 hover:bg-emerald-50" aria-label="Ações do card" data-ignore-card-click onClick={(e)=> e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0 bg-white border-0 shadow-lg rounded-lg" side="right" align="end" sideOffset={6}>
              <div className="py-1">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-md"
                  onClick={() => { setMenuOpen(false); onMenu(); }}
                >
                  Mover…
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-700">
        {card.phone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-zinc-400" />
            {card.phone}
          </span>
        )}
        {card.whatsapp && (
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-zinc-400" />
            WhatsApp
          </span>
        )}
        {card.bairro && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            Bairro: {card.bairro}
          </span>
        )}
        {card.dueAt && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            Ag.: {new Date(card.dueAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {card.extraAction}
    </div>
  );
}

