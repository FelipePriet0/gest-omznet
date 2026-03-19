"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KanbanSingleCalendar } from "@/components/app/kanban-single-calendar";

export function DateNavigator({ dateISO, onPrev, onNext, onPick }: { dateISO: string; onPrev: () => void; onNext: () => void; onPick: (value: string) => void }) {
  const date = new Date(dateISO + "T00:00:00");
  const label = format(date, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR });
  return (
    <div className="flex items-center justify-center gap-3">
      <button onClick={onPrev} className="btn-small-secondary" aria-label="Dia anterior">◀</button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="px-2 py-1 text-[var(--verde-primario)] text-sm font-bold rounded-md select-none transition hover:bg-[var(--verde-primario)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-0 shadow-md bg-white rounded-xl" align="center" sideOffset={8}>
          <KanbanSingleCalendar
            value={dateISO}
            onChange={(v) => { if (v) onPick(v); }}
          />
        </PopoverContent>
      </Popover>
      <button onClick={onNext} className="btn-small-secondary" aria-label="Próximo dia">▶</button>
    </div>
  );
}
