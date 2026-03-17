"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, Filter as FilterIcon, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { AgendaGrid } from "./components/AgendaGrid";
import { AgendaCard } from "./components/AgendaCard";
import { DateNavigator } from "./components/DateNavigator";
import { Legend } from "./components/Legend";
import { TIME_SLOTS } from "./mock";
import {
  fetchAgendaTechnicians,
  fetchAgendaCardsByDate,
  fetchFreeRows,
  addFreeRow,
  deleteFreeRow,
  updateScheduleCard,
  clearScheduleCard,
  updateApplicant,
} from "./services";
import type { ScheduleCard, Technician, FreeRow } from "./types";

export function AgendaPage() {
  const canEdit = true;

  const [dateISO, setDateISO]           = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [technicians, setTechnicians]   = useState<Technician[]>([]);
  const [cards, setCards]               = useState<ScheduleCard[]>([]);
  const [freeRows, setFreeRows]         = useState<FreeRow[]>([]);
  const [loading, setLoading]           = useState(false);
  const [addingRow, setAddingRow]       = useState(false);
  const [stageFilter, setStageFilter]   = useState<string | null>(null);
  const [stagePopoverOpen, setStagePopoverOpen] = useState(false);
  const [query, setQuery]               = useState<string>("");

  // DnD: rastrear card sendo arrastado para o DragOverlay
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeCard = useMemo(
    () => (activeDragId ? cards.find((c) => c.id === activeDragId) || null : null),
    [activeDragId, cards],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const slots = useMemo(() => TIME_SLOTS, []);

  // ── Load ────────────────────────────────────────────────────────────────
  async function reload(dayISO: string) {
    setLoading(true);
    try {
      const [techs, cs, rows] = await Promise.all([
        fetchAgendaTechnicians(),
        fetchAgendaCardsByDate(dayISO),
        fetchFreeRows(), // linhas são globais — não dependem da data
      ]);
      setTechnicians(techs);
      setCards(cs as any);
      setFreeRows(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload(dateISO).catch((e) => console.error("Falha ao carregar agenda", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeDay = (delta: number) => {
    const d = new Date(dateISO + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    setDateISO(next);
    reload(next);
  };

  // ── Adicionar linha livre ──────────────────────────────────────────────
  const handleAddFreeRow = async () => {
    setAddingRow(true);
    try {
      const newRow = await addFreeRow(); // global — não leva data
      setFreeRows((prev) => [...prev, newRow]);
    } catch (e) {
      console.error("Falha ao adicionar linha livre", e);
    } finally {
      setAddingRow(false);
    }
  };

  // ── Deletar linha livre ────────────────────────────────────────────────
  const handleDeleteFreeRow = async (id: string) => {
    try {
      await deleteFreeRow(id);
      setFreeRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Falha ao remover linha livre", e);
    }
  };

  // ── Drag and Drop ────────────────────────────────────────────────────────
  const onDragStart = (ev: DragStartEvent) => {
    setActiveDragId(String(ev.active.id));
  };

  const onDragEnd = async (ev: DragEndEvent) => {
    setActiveDragId(null);
    const cardId = String(ev.active?.id || "");
    if (!cardId || cardId.startsWith("tmp-")) return;

    const overId = ev.over?.id ? String(ev.over.id) : null;
    if (!overId) return;

    // ── Linha livre: free::<date>::<rowId>::<time> ─────────────────────
    if (overId.startsWith("free::")) {
      const parts = overId.split("::");
      const d    = parts[1]; // dateISO
      const rowId = parts[2]; // UUID da linha livre
      const time = parts[3]; // slot
      if (!d || !rowId || !time) return;

      const card = cards.find((c) => c.id === cardId);
      // Já está nesta mesma linha livre e slot → não fazer nada
      if (card && !card.technician_id && card.free_row_id === rowId && card.time_slot === time && card.date === d) return;

      // Slot já ocupado por outro card → bloquear
      const freeConflict = cards.some(
        (c) =>
          c.id !== cardId &&
          !c.technician_id &&
          c.free_row_id === rowId &&
          c.date === d &&
          (c.time_slots?.includes(time) || c.time_slot === time),
      );
      if (freeConflict) return;

      // Otimista: limpar technician_id, setar free_row_id correto, resetar time_slots
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, technician_id: "", free_row_id: rowId, time_slot: time, time_slots: [time], date: d }
            : c,
        ),
      );

      try {
        await updateScheduleCard({
          id: cardId,
          dateISO: d,
          technician_id: null,
          free_row_id: rowId,
          time_slot: time,
        });
      } catch (e) {
        console.error("Falha ao mover para linha livre", e);
        await reload(dateISO);
      }
      return;
    }

    // ── Linha de técnico: cell::<date>::<techId>::<time> ─────────────
    if (!overId.startsWith("cell::")) return;
    const [, d, techId, time] = overId.split("::");
    if (!d || !techId || !time) return;

    const card = cards.find((c) => c.id === cardId);
    if (card && card.technician_id === techId && card.time_slot === time && card.date === d) return;

    // Slot já ocupado por outro card do mesmo técnico → bloquear
    const cellConflict = cards.some(
      (c) =>
        c.id !== cardId &&
        c.technician_id === techId &&
        c.date === d &&
        (c.time_slots?.includes(time) || c.time_slot === time),
    );
    if (cellConflict) return;

    // Otimista: atribuir técnico + limpar free_row_id + resetar time_slots
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, technician_id: techId, free_row_id: null, time_slot: time, time_slots: [time], date: d } : c,
      ),
    );

    try {
      await updateScheduleCard({ id: cardId, dateISO: d, technician_id: techId, free_row_id: null, time_slot: time });
    } catch (e) {
      console.error("Falha ao mover agendamento", e);
      await reload(dateISO);
    }
  };

  const onDragCancel = () => setActiveDragId(null);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const filteredCards = useMemo(() => {
    let list = cards as any[];
    const term = (query || "").toLowerCase();
    if (term) list = list.filter((c) => (c.cliente || "").toLowerCase().includes(term));
    if (stageFilter) {
      if (stageFilter === "comercial") list = list.filter((c) => ((c as any).area || "") === "comercial");
      else list = list.filter((c) => (((c as any).stage || "") as string).toLowerCase() === stageFilter);
    }
    return list as ScheduleCard[];
  }, [cards, query, stageFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="border-b border-white/40 bg-[var(--neutro)] px-3 pb-4 pt-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Esquerda: data + filtros */}
          <div className="flex items-center gap-2">
            <DateNavigator
              dateISO={dateISO}
              onPrev={() => handleChangeDay(-1)}
              onNext={() => handleChangeDay(1)}
              onPick={(v) => { setDateISO(v); reload(v); }}
            />
            <Popover open={stagePopoverOpen} onOpenChange={setStagePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold bg-white text-[var(--verde-primario)] border-[var(--verde-primario)] hover:bg-emerald-50"
                  aria-label="Filtrar por estágio/área"
                >
                  <FilterIcon className="h-4 w-4" />
                  Filtros
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-1 bg-white border border-zinc-200 rounded-lg" align="start" sideOffset={8}>
                {[
                  { key: null,           label: "Todos"       },
                  { key: "comercial",    label: "Comercial"   },
                  { key: "em_analise",   label: "Em Análise"  },
                  { key: "aprovados",    label: "Aprovado"    },
                  { key: "negados",      label: "Negado"      },
                  { key: "reanalise",    label: "Reanálise"   },
                ].map((f) => (
                  <button
                    key={String(f.key)}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition ${stageFilter === f.key ? "bg-emerald-50 text-emerald-700" : "hover:bg-zinc-100 text-zinc-800"}`}
                    onClick={() => { setStageFilter(f.key as any); setStagePopoverOpen(false); }}
                  >
                    {f.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Direita: Adicionar linha + busca */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={addingRow}
              onClick={handleAddFreeRow}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Adicionar linha
            </button>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--verde-primario)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar nome do cliente..."
                aria-label="Pesquisar agendamento por nome do cliente"
                className="h-9 w-56 rounded-md border border-[var(--verde-primario)] bg-white/10 pl-8 pr-3 text-sm text-white placeholder:text-[var(--verde-primario)] focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-3 flex justify-end">
          <Legend />
        </div>
      </div>

      {/* ── Grid com DnD ── */}
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {loading ? (
          <div className="px-6 py-4 text-sm text-white/60">Carregando agenda…</div>
        ) : (
          <AgendaGrid
            dateISO={dateISO}
            technicians={technicians}
            slots={slots}
            cards={filteredCards}
            freeRows={freeRows}
            canEdit={canEdit}
            onDeleteFreeRow={handleDeleteFreeRow}
            onUpdate={async (id, patch) => {
              try {
                const card = cards.find((c) => c.id === id) as any;
                if (!card) return;
                const promises: Promise<any>[] = [];
                if (typeof (patch as any).cliente !== "undefined" || typeof (patch as any).bairro !== "undefined") {
                  promises.push(updateApplicant(card.applicant_id, {
                    primary_name: (patch as any).cliente,
                    bairro: (patch as any).bairro,
                  }));
                }
                const schedPatch: any = {};
                if (typeof (patch as any).technician_id !== "undefined") schedPatch.technician_id = (patch as any).technician_id;
                if (typeof (patch as any).time_slot     !== "undefined") schedPatch.time_slot     = (patch as any).time_slot;
                if (typeof (patch as any).tipo_instalacao !== "undefined") schedPatch.tipo_instalacao = (patch as any).tipo_instalacao;
                if (Object.keys(schedPatch).length > 0) promises.push(updateScheduleCard({ id, ...schedPatch }));
                await Promise.all(promises);
                await reload(dateISO);
              } catch (e) { console.error("Falha ao salvar agendamento", e); }
            }}
            onDelete={async (id) => {
              try {
                await clearScheduleCard(id);
                await reload(dateISO);
              } catch (e) { console.error("Falha ao excluir agendamento", e); }
            }}
          />
        )}

        {/* Overlay visual durante o drag */}
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <AgendaCard
              card={activeCard}
              canEdit={false}
              onEdit={() => {}}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
