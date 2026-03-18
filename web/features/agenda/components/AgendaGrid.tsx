"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AgendaCard } from "./AgendaCard";
import { AgendaEditModal } from "./AgendaEditModal";
import type { ScheduleCard, Technician, FreeRow } from "../types";

// ── Pares de slots que um card pode cobrir simultaneamente ─────────────────
const SPAN_NEXT: Record<string, string> = {
  "08:30": "10:30",
  "13:30": "15:30",
};

// ── Drop zone de célula ────────────────────────────────────────────────────
function CellDroppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={[
        "min-h-[64px] rounded-lg p-1 transition-all duration-150",
        isOver ? "bg-emerald-500/20 ring-2 ring-emerald-400/60 ring-inset" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

// ── Distribuição de cards sem técnico ─────────────────────────────────────
// Agrupa por free_row_id do card. Cards sem free_row_id vão para a primeira linha.
function distributeNullCards(
  nullCards: ScheduleCard[],
  freeRows: FreeRow[],
): Map<string /* rowId::slot */, ScheduleCard[]> {
  const map = new Map<string, ScheduleCard[]>();
  if (freeRows.length === 0) return map;

  const firstRowId = freeRows[0].id;

  for (const card of nullCards) {
    const targetRowId =
      card.free_row_id && freeRows.some((r) => r.id === card.free_row_id)
        ? card.free_row_id
        : firstRowId;

    const key = `${targetRowId}::${card.time_slot}`;
    const arr = map.get(key) || [];
    arr.push(card);
    map.set(key, arr);
  }
  return map;
}

// ── Context menu (right-click) state ──────────────────────────────────────
type CtxMenu = {
  rowId: string;
  x: number;
  y: number;
  confirming: boolean;
};

// ── AgendaGrid ─────────────────────────────────────────────────────────────
export function AgendaGrid({
  dateISO,
  technicians,
  slots,
  cards,
  freeRows,
  canEdit,
  onDeleteFreeRow,
  onUpdate,
  onDelete,
}: {
  dateISO: string;
  technicians: Technician[];
  slots: readonly string[];
  cards: ScheduleCard[];
  freeRows: FreeRow[];
  canEdit: boolean;
  onDeleteFreeRow: (id: string) => void;
  onUpdate: (id: string, patch: Partial<ScheduleCard>) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu]     = useState<CtxMenu | null>(null);
  const ctxRef                    = useRef<HTMLDivElement>(null);

  // Fechar context menu ao clicar fora
  useEffect(() => {
    if (!ctxMenu) return;
    function handleOutside(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [ctxMenu]);

  // ── Agrupar cards com técnico por techId::slot ────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleCard[]>();
    for (const c of cards) {
      if (c.date !== dateISO) continue;
      if (!c.technician_id) continue;
      const key = `${c.technician_id}::${c.time_slot}`;
      const arr = map.get(key) || [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [cards, dateISO]);

  // ── Cards sem técnico distribuídos entre linhas livres ────────────────
  const nullCards = useMemo(
    () => cards.filter((c) => c.date === dateISO && !c.technician_id),
    [cards, dateISO],
  );
  const nullGrouped = useMemo(
    () => distributeNullCards(nullCards, freeRows),
    [nullCards, freeRows],
  );

  const editingCard = useMemo(
    () => (editingId ? cards.find((c) => c.id === editingId) || null : null),
    [editingId, cards],
  );

  // ── Helper: renderizar uma linha de células ────────────────────────────
  function renderCells(
    getCellId: (slot: string) => string,
    getItems: (slot: string) => ScheduleCard[],
  ) {
    const consumedSlots = new Set<string>();
    return slots.map((slot) => {
      if (consumedSlots.has(slot)) return null;

      const items    = getItems(slot);
      const nextSlot = SPAN_NEXT[slot];
      const hasSpanCard = !!nextSlot && items.some(
        (c) => c.time_slots && c.time_slots.includes(nextSlot),
      );

      if (hasSpanCard && nextSlot) consumedSlots.add(nextSlot);
      const colSpan = hasSpanCard ? 2 : 1;

      return (
        <td
          key={slot}
          colSpan={colSpan}
          className="align-top px-2 py-1.5 border-t border-white/10"
        >
          <CellDroppable id={getCellId(slot)}>
            <div className="flex flex-col gap-1">
              {items.map((c) => (
                <AgendaCard
                  key={c.id}
                  card={c}
                  canEdit={canEdit}
                  onEdit={(id) => setEditingId(id)}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </CellDroppable>
        </td>
      );
    });
  }

  return (
    <>
      {/* ── Context menu (right-click em linha livre) ──────────────── */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          style={{ position: "fixed", top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="min-w-[200px] overflow-hidden rounded-xl bg-white shadow-xl border border-zinc-200"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {!ctxMenu.confirming ? (
            /* ── Menu principal ── */
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                Linha {freeRows.find((r) => r.id === ctxMenu.rowId)?.display_order}
              </div>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                onClick={() => setCtxMenu({ ...ctxMenu, confirming: true })}
              >
                Excluir linha
              </button>
            </div>
          ) : (
            /* ── Confirmação ── */
            <div className="p-3">
              <p className="mb-1 text-sm font-semibold text-zinc-800">Excluir esta linha?</p>
              <p className="mb-3 text-xs text-zinc-500 leading-snug">
                A linha será removida da agenda em todos os dias e não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                  onClick={() => setCtxMenu(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition"
                  onClick={() => {
                    onDeleteFreeRow(ctxMenu.rowId);
                    setCtxMenu(null);
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tabela ────────────────────────────────────────────────────── */}
      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 shadow-sm">
        <AgendaEditModal
          open={!!editingCard}
          card={editingCard}
          technicians={technicians}
          slots={slots}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            if (!editingCard) return;
            onUpdate(editingCard.id, patch);
            setEditingId(null);
          }}
          onDelete={() => {
            if (!editingCard) return;
            onDelete(editingCard.id);
            setEditingId(null);
          }}
        />

        <table className="min-w-[900px] w-full border-separate border-spacing-0">
          <colgroup>
            <col style={{ width: 180 }} />
            {slots.map((_, idx) => <col key={idx} style={{ width: 180 }} />)}
          </colgroup>

          {/* ── Header ───────────────────────────────────────────────── */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 px-4 py-3 text-left text-xs font-semibold text-white backdrop-blur rounded-tl-2xl border-b border-white/20 bg-[var(--verde-primario)] w-[180px] min-w-[180px] max-w-[180px]">
                Técnico
              </th>
              {slots.map((s, i) => (
                <th
                  key={s}
                  className={`px-4 py-3 text-left text-xs font-semibold text-white border-b border-white/20 bg-[var(--verde-primario)] ${i === slots.length - 1 ? "rounded-tr-2xl" : ""}`}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Linhas de técnicos ───────────────────────────────── */}
            {technicians.filter((t) => t.active).map((tech, rowIdx) => (
              <tr key={tech.id}>
                <td className={`sticky left-0 z-10 px-4 py-3 text-sm text-white font-medium backdrop-blur border-t bg-[var(--verde-primario)] w-[180px] min-w-[180px] max-w-[180px] ${rowIdx === 0 ? "border-transparent" : "border-white/20"}`}>
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{tech.name}</span>
                </td>
                {renderCells(
                  (slot) => `cell::${dateISO}::${tech.id}::${slot}`,
                  (slot) => grouped.get(`${tech.id}::${slot}`) || [],
                )}
              </tr>
            ))}

            {/* ── Linhas livres (globais) ──────────────────────────── */}
            {freeRows.map((row) => (
              <tr key={row.id}>
                {/* Label — right-click abre o context menu */}
                <td
                  className="sticky left-0 z-10 px-4 py-3 backdrop-blur border-t border-dashed border-white/20 bg-[var(--verde-primario)] w-[180px] min-w-[180px] max-w-[180px] cursor-context-menu select-none"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCtxMenu({ rowId: row.id, x: e.clientX, y: e.clientY, confirming: false });
                  }}
                  title="Clique com o botão direito para opções"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="block text-xs font-medium text-white/50 italic truncate">
                      Linha {row.display_order}
                    </span>
                    <span className="inline-flex h-4 items-center rounded-full bg-white/10 px-1.5 text-[9px] font-semibold text-white/40 uppercase tracking-wide">
                      livre
                    </span>
                  </div>
                </td>

                {renderCells(
                  (slot) => `free::${dateISO}::${row.id}::${slot}`,
                  (slot) => nullGrouped.get(`${row.id}::${slot}`) || [],
                )}
              </tr>
            ))}

            {/* ── Placeholder ──────────────────────────────────────── */}
            {technicians.filter((t) => t.active).length === 0 && freeRows.length === 0 && (
              <tr>
                <td colSpan={slots.length + 1} className="px-6 py-8 text-center text-sm text-white/40 border-t border-white/10">
                  Nenhum técnico ou linha livre. Use "Adicionar linha" para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
