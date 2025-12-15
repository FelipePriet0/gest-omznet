"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DateNavigator({ dateISO, onPrev, onNext }: { dateISO: string; onPrev: () => void; onNext: () => void }) {
  const date = new Date(dateISO + "T00:00:00");
  const label = format(date, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR });
  return (
    <div className="flex items-center justify-center gap-3">
      <button onClick={onPrev} className="btn-small-secondary" aria-label="Dia anterior">◀</button>
      <div className="px-2 py-0.5 text-[var(--verde-primario)] text-sm font-bold select-none">
        {label}
      </div>
      <button onClick={onNext} className="btn-small-secondary" aria-label="Próximo dia">▶</button>
    </div>
  );
}
