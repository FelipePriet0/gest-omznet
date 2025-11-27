"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function AgendaPage() {
  const sp = useSearchParams();
  const summary = useMemo(() => {
    const hora = sp.get("hora") || "—";
    const prazo = sp.get("prazo") || "";
    const prazoFim = sp.get("prazo_fim") || "";
    const periodo = prazo ? (prazoFim && prazoFim !== prazo ? `${prazo} – ${prazoFim}` : prazo) : "—";
    return { hora, periodo };
  }, [sp]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-preto">Agenda</h1>
      <p className="text-sm text-zinc-600">
        Use os filtros acima para ajustar a data e o horário. A UI utiliza os mesmos componentes do Kanban (chips e calendário).
      </p>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-zinc-700">Resumo atual:</div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div><span className="text-xs text-zinc-500">Período:</span> <span className="font-medium">{summary.periodo}</span></div>
          <div><span className="text-xs text-zinc-500">Hora:</span> <span className="font-medium">{summary.hora}</span></div>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white/40 p-6 text-sm text-zinc-500">
        Área da Agenda (conteúdo funcional entra aqui).
      </div>
    </div>
  );
}

