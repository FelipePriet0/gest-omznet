"use client";

import { useMemo, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { AgendaGrid } from "./components/AgendaGrid";
import { DateNavigator } from "./components/DateNavigator";
import { Legend } from "./components/Legend";
import { initialTechnicians, initialCards, TIME_SLOTS } from "./mock";
import type { ScheduleCard, Technician } from "./types";

export function AgendaPage() {
  const { role } = useUserRole();
  const isInstaller = (role || "").toLowerCase() === "instalação" || (role || "").toLowerCase() === "instalacao";

  const [dateISO, setDateISO] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [technicians] = useState<Technician[]>(() => initialTechnicians());
  const [cards, setCards] = useState<ScheduleCard[]>(() => initialCards(dateISO));

  // Quando trocar a data, por enquanto usamos um mock limpo
  const handleChangeDay = (delta: number) => {
    const d = new Date(dateISO + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    setDateISO(next);
    setCards(initialCards(next));
  };

  const slots = useMemo(() => TIME_SLOTS, []);

  const onDragEnd = (ev: DragEndEvent) => {
    if (!isInstaller) return; // UI-only: Leitor não move
    const cardId = String(ev.active?.id || "");
    const overId = ev.over?.id ? String(ev.over.id) : null;
    if (!cardId || !overId) return;
    // overId formato: cell::<date>::<techId>::<time>
    if (!overId.startsWith("cell::")) return;
    const [_c, d, techId, time] = overId.split("::");
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, date: d, technician_id: techId, time_slot: time } : c)));
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <DateNavigator dateISO={dateISO} onPrev={() => handleChangeDay(-1)} onNext={() => handleChangeDay(1)} />
        <Legend />
      </div>
      {!isInstaller && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--verde-primario)]">
          Visualização somente leitura — sua role não permite modificar agendamentos.
        </div>
      )}
      <DndContext onDragEnd={onDragEnd}>
        <AgendaGrid
          dateISO={dateISO}
          technicians={technicians}
          slots={slots}
          cards={cards}
          canEdit={isInstaller}
          onCreate={(payload) => setCards((prev) => [...prev, payload])}
          onUpdate={(id, patch) => setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))}
          onDelete={(id) => setCards((prev) => prev.filter((c) => c.id !== id))}
        />
      </DndContext>
    </div>
  );
}
