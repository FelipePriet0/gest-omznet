"use client";

import { useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { KanbanCard as Card } from "@/features/kanban/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreVertical, Phone, MapPin, Calendar, Clock, Flame, AtSign } from "lucide-react";

export function KanbanCard({ card, onOpen, onMenu }: { card: Card; onOpen: () => void; onMenu: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    willChange: 'transform, opacity',
    zIndex: isDragging ? 1000 : undefined,
    boxShadow: "0 6px 16px rgba(30,41,59,0.06)",
    opacity: isDragging ? 0 : 1,
  } as React.CSSProperties;
  const [menuOpen, setMenuOpen] = useState(false);
  const pressAt = useRef(0);

  const isOverdue = (() => {
    if (!card?.dueAt) return false;
    try { return new Date(card.dueAt).getTime() < Date.now(); } catch { return false; }
  })();

  const cardClass = (card.isMentioned && isOverdue)
    ? "kanban-card rounded-2xl border border-orange-300 bg-emerald-50 p-3 shadow-[0_6px_16px_rgba(251,146,60,0.15)] hover:shadow-[0_10px_24px_rgba(251,146,60,0.25)] transition"
    : card.isMentioned
    ? "kanban-card rounded-2xl border border-emerald-300 bg-emerald-50 p-3 shadow-[0_6px_16px_rgba(16,185,129,0.15)] hover:shadow-[0_10px_24px_rgba(16,185,129,0.25)] transition"
    : isOverdue
    ? "kanban-card rounded-2xl border border-orange-300 bg-orange-50 p-3 shadow-[0_6px_16px_rgba(251,146,60,0.15)] hover:shadow-[0_10px_24px_rgba(251,146,60,0.25)] transition"
    : "kanban-card rounded-2xl border border-emerald-100/40 bg-white p-3 shadow-[0_6px_16px_rgba(30,41,59,0.06)] hover:shadow-[0_10px_24px_rgba(30,41,59,0.10)] transition";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClass}
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
          {card.isMentioned && (
            <span className="text-emerald-600" title="Você foi mencionado" aria-label="Mencionado" data-ignore-card-click>
              <AtSign className="w-4 h-4" />
            </span>
          )}
          {isOverdue && (
            <span className="text-orange-500" title="Atrasado" aria-label="Atrasado" data-ignore-card-click>
              <Flame className="w-4 h-4" />
            </span>
          )}
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
            <img src="/whatsapp.svg" alt="WhatsApp" className="w-3.5 h-3.5" />
            {card.whatsapp}
          </span>
        )}
        {card.bairro && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            Bairro: {card.bairro}
          </span>
        )}
        {card.horaAt && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            {card.horaAt}
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
