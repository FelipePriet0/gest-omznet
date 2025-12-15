"use client";

import { useMemo, useState, useLayoutEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AgendaCard } from "./AgendaCard";
import type { ScheduleCard, Technician } from "../types";

function CellDroppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-[48px] rounded-md p-1 transition ${isOver ? "bg-white/10" : "bg-white/5"}`}>
      {children}
    </div>
  );
}

export function AgendaGrid({
  dateISO,
  technicians,
  slots,
  cards,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
}: {
  dateISO: string;
  technicians: Technician[];
  slots: string[];
  cards: ScheduleCard[];
  canEdit: boolean;
  onCreate: (payload: ScheduleCard) => void;
  onUpdate: (id: string, patch: Partial<ScheduleCard>) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timeColWidth, setTimeColWidth] = useState<number | null>(null);
  const firstTimeThRef = useRef<HTMLTableCellElement | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      try {
        const w = firstTimeThRef.current?.offsetWidth;
        if (w && w > 0) setTimeColWidth(w);
      } catch {}
    };
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleCard[]>();
    for (const c of cards) {
      if (c.date !== dateISO) continue;
      const key = `${c.technician_id}::${c.time_slot}`;
      const arr = map.get(key) || [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [cards, dateISO]);

  const handleCreate = (techId: string, slot: string) => {
    const id = `tmp-${Math.random().toString(36).slice(2, 8)}`;
    onCreate({ id, date: dateISO, technician_id: techId, time_slot: slot, cliente: "Novo Cliente", bairro: "-", tipo_instalacao: "casa", status: "aprovado" });
    setEditingId(id);
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-black/30 shadow-sm">
      <table className="min-w-[840px] w-full border-separate border-spacing-0">
        <colgroup>
          <col style={{ width: 220 }} />
          {slots.map((_, idx) => (
            <col key={idx} style={timeColWidth ? { width: `${timeColWidth}px` } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 px-4 py-3 text-left text-xs font-semibold text-white backdrop-blur rounded-tl-2xl border-b border-white/20 bg-[var(--verde-primario)] w-[220px] min-w-[220px] max-w-[220px]">Técnico</th>
            {slots.map((s, i) => (
              <th
                key={s}
                ref={i === 0 ? firstTimeThRef : undefined}
                className={`px-4 py-3 text-left text-xs font-semibold text-white border-b border-white/20 bg-[var(--verde-primario)] ${i === slots.length - 1 ? 'rounded-tr-2xl' : ''}`}
              >
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {technicians.filter(t => t.active).map((tech, rowIdx) => (
            <tr key={tech.id} className="">
              <td className={`sticky left-0 z-10 px-4 py-3 text-sm text-white font-medium backdrop-blur border-t bg-[var(--verde-primario)] w-[220px] min-w-[220px] max-w-[220px] ${rowIdx === 0 ? 'border-transparent' : 'border-white/20'}`}>
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{tech.name}</span>
              </td>
              {slots.map((slot) => {
                const key = `${tech.id}::${slot}`;
                const cellId = `cell::${dateISO}::${tech.id}::${slot}`;
                const items = grouped.get(key) || [];
                return (
                  <td key={slot} className="align-top px-3 py-1 border-t border-white/20">
                    <CellDroppable id={cellId}>
                      <div className="flex flex-col gap-2">
                        {items.map((c) => (
                          <AgendaCard
                            key={c.id}
                            card={c}
                            canEdit={canEdit}
                            onEdit={(id) => setEditingId(id)}
                            onDelete={onDelete}
                          />
                        ))}
                        {canEdit && (
                          <button onClick={() => handleCreate(tech.id, slot)} className="btn-small-secondary mt-1 self-start">
                            + Agendar aqui
                          </button>
                        )}
                        {!items.length && !canEdit && (
                          <div className="text-[11px] text-white/30 select-none">— vazio —</div>
                        )}
                      </div>
                    </CellDroppable>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
