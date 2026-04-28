"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, ListFilter, PlusCircle, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
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
import { supabase } from "@/lib/supabaseClient";
import { FEATURES } from "@/lib/features";
import {
  fetchAgendaTechnicians,
  fetchAgendaCardsByDate,
  searchAgendaCardsGlobal,
  fetchFreeRows,
  addFreeRow,
  deleteFreeRow,
  updateScheduleCard,
  clearScheduleCard,
  updateApplicant,
} from "./services";
import type { ScheduleCard, Technician, FreeRow } from "./types";

// ── Opções de filtro (stage) ──────────────────────────────────────────────────
const STAGE_FILTERS = [
  { key: null,           label: "Todos"       },
  { key: "comercial",    label: "Comercial"   },
  { key: "em_analise",   label: "Em Análise"  },
  { key: "ass_app",      label: "Ass App"     },
  { key: "aprovados",    label: "Aprovado"    },
  { key: "negados",      label: "Negado"      },
  { key: "reanalise",    label: "Reanálise"   },
] as const;

export function AgendaPage() {
  const canEdit = true;

  const [dateISO, setDateISO]           = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [technicians, setTechnicians]   = useState<Technician[]>([]);
  const [cards, setCards]               = useState<ScheduleCard[]>([]);
  const [freeRows, setFreeRows]         = useState<FreeRow[]>([]);
  const [loading, setLoading]           = useState(false);
  const [addingRow, setAddingRow]       = useState(false);
  const [stageFilters, setStageFilters] = useState<string[]>([]);
  const [stagePopoverOpen, setStagePopoverOpen] = useState(false);
  const [query, setQuery]               = useState<string>("");
  const [globalSearchCards, setGlobalSearchCards] = useState<ScheduleCard[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [highlightDate, setHighlightDate] = useState(false);

  // Busca global debounced quando query muda
  useEffect(() => {
    const term = (query || "").trim();
    if (!term) {
      setGlobalSearchCards([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAgendaCardsGlobal(term);
        setGlobalSearchCards(results as any);
        // Se houver resultados, navegar para a data do primeiro item
        const first = (results || [])[0];
        if (first && first.date && first.date !== dateISO) {
          setDateISO(first.date);
          await reload(first.date);
          // pulso visual na data para indicar mudança
          setHighlightDate(true);
          setTimeout(() => setHighlightDate(false), 1200);
        }
      } catch (e) {
        console.error("Busca global falhou", e);
        setGlobalSearchCards([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

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

  // Recarregar quando o Workflow publicado mudar (gestor 24/7)
  useEffect(() => {
    const channel = supabase
      .channel('rt-builder-workflows')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'builder_workflows' }, (payload) => {
        try {
          const row: any = payload.new || payload.old || {};
          // Reagir apenas quando houver publish (published_at setado)
          if (row && row.published_at) {
            reload(dateISO).catch(() => {});
          }
        } catch {}
      })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [dateISO]);

  // Recarregar quando houver mudanças em kanban_cards (reassignments server-side)
  // Evita flicker: suprime o próximo reload quando a própria UI acabou de atualizar otimisticamente
  const suppressNextReloadRef = useMemo(() => ({ current: false }), []);
  useEffect(() => {
    const ch = supabase
      .channel('rt-kanban-cards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_cards' }, (_payload) => {
        if (suppressNextReloadRef.current) {
          suppressNextReloadRef.current = false;
          return;
        }
        reload(dateISO).catch(() => {});
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [dateISO, suppressNextReloadRef]);

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

      // Preservar span nas linhas livres também
      const SPAN_NEXT_FREE: Record<string, string> = { "08:30": "10:30", "13:30": "15:30" };
      const wasSpanFree = !!(card?.time_slots && card.time_slots.length > 1);
      const nextSlotFree = SPAN_NEXT_FREE[time];
      const newTimeSlotsFree = wasSpanFree && nextSlotFree ? [time, nextSlotFree] : [time];

      // Já está nesta mesma linha livre e slot → não fazer nada
      if (card && !card.technician_id && card.free_row_id === rowId && card.time_slot === time && card.date === d &&
          JSON.stringify(card.time_slots) === JSON.stringify(newTimeSlotsFree)) return;

      // Verificar conflito para TODOS os slots (linha livre)
      const freeConflict = cards.some(
        (c) =>
          c.id !== cardId &&
          !c.technician_id &&
          c.free_row_id === rowId &&
          c.date === d &&
          newTimeSlotsFree.some((slot) => c.time_slots?.includes(slot) || c.time_slot === slot),
      );
      if (freeConflict) return;

      // Otimista: limpar technician_id, setar free_row_id correto, preservar time_slots
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, technician_id: "", free_row_id: rowId, time_slot: time, time_slots: newTimeSlotsFree, date: d }
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
          time_slots: newTimeSlotsFree,
        });
        suppressNextReloadRef.current = true;
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

    // Bloqueio: técnico em Mudança de Endereço não recebe agendamento
    try {
      const tech = technicians.find((t) => t.id === techId);
      if (tech && String(tech.activity || '').toLowerCase().includes('mud')) {
        alert('Técnico indisponível (Mudança de Endereço)');
        return;
      }
    } catch {}

    // Preservar span: se o card tinha 2 slots e o destino é início de par válido, manter os 2
    const SPAN_NEXT_DND: Record<string, string> = { "08:30": "10:30", "13:30": "15:30" };
    const wasSpan = !!(card?.time_slots && card.time_slots.length > 1);
    const nextSlotForDest = SPAN_NEXT_DND[time];
    const newTimeSlots = wasSpan && nextSlotForDest ? [time, nextSlotForDest] : [time];

    if (card && card.technician_id === techId && card.time_slot === time && card.date === d &&
        JSON.stringify(card.time_slots) === JSON.stringify(newTimeSlots)) return;

    // Verificar conflito para TODOS os slots que o card vai ocupar
    const cellConflict = cards.some(
      (c) =>
        c.id !== cardId &&
        c.technician_id === techId &&
        c.date === d &&
        newTimeSlots.some((slot) => c.time_slots?.includes(slot) || c.time_slot === slot),
    );
    if (cellConflict) return;

    // Otimista: atribuir técnico + limpar free_row_id + preservar time_slots correto
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, technician_id: techId, free_row_id: null, time_slot: time, time_slots: newTimeSlots, date: d } : c,
      ),
    );

    try {
      await updateScheduleCard({ id: cardId, dateISO: d, technician_id: techId, free_row_id: null, time_slot: time, time_slots: newTimeSlots });
      suppressNextReloadRef.current = true;
    } catch (e) {
      console.error("Falha ao mover agendamento", e);
      await reload(dateISO);
    }
  };

  const onDragCancel = () => setActiveDragId(null);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const isGlobalSearch = (query || "").trim().length > 0;
  const filteredCards = useMemo(() => {
    // Sempre mostrar os cards do dia carregado; busca global só navega de data
    let list = cards as any[];
    if (stageFilters.length > 0) {
      list = list.filter((c) => {
        const area = String(((c as any).area  || '')).toLowerCase();
        const st   = String(((c as any).stage || '')).toLowerCase();
        for (const f of stageFilters) {
          if (f === 'comercial' && area === 'comercial') return true;
          if (f === 'em_analise' && (st === 'em_analise' || st === 'recebidos')) return true;
          if (f === 'ass_app' && st === 'ass_app') return true;
          if (st === f) return true;
        }
        return false;
      });
    }
    return list as ScheduleCard[];
  }, [cards, stageFilters]);

  // IDs destacados: apenas os que batem com a busca por nome (cor primária)
  const highlightedIds = useMemo(() => {
    const term = (query || '').trim().toLowerCase();
    if (!term) return new Set<string>();
    const set = new Set<string>();
    for (const c of filteredCards) {
      const name = String((c as any).cliente || '').toLowerCase();
      if (name.includes(term)) set.add(c.id);
    }
    return set;
  }, [filteredCards, query]);

  // Label do filtro ativo (para o chip)
  const activeFilterLabels = useMemo(() => {
    if (stageFilters.length === 0) return [] as string[];
    const labels = new Map<string, string>();
    for (const f of STAGE_FILTERS) if (f.key) labels.set(f.key, f.label);
    return stageFilters.map((k) => labels.get(k) || k);
  }, [stageFilters]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="border-b border-white/40 bg-[var(--neutro)] px-3 pb-4 pt-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Esquerda: Busca por nome — texto digitado em cor primária */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--verde-primario)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar nome..."
              aria-label="Pesquisar agendamento por nome do cliente"
              className="h-9 w-56 rounded-md border border-[var(--verde-primario)] bg-white/10 pl-8 pr-3 text-sm placeholder:text-[var(--verde-primario)] focus:outline-none focus:ring-2 focus:ring-emerald-400"
              style={{ color: 'var(--verde-primario)' }}
            />
          </div>

          {/* Direita: Filtros + chip | < data > | Adicionar Linhas */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* CTA Filtros — estilo igual Kanban/Tarefas/Caixa de entrada */}
            <Popover open={stagePopoverOpen} onOpenChange={setStagePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className="transition-all duration-200 group h-9 text-sm items-center flex gap-1.5 filter-cta-hover"
                  style={{ paddingLeft: "18px", paddingRight: "18px", borderRadius: "10px" }}
                >
                  <ListFilter className="size-6 shrink-0 transition-all text-muted-foreground filter-icon" />
                  {stageFilters.length === 0 && "Filtros"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 bg-white border-0 shadow-lg rounded-lg" align="start" sideOffset={8}>
                <Command className="rounded-lg">
                  <CommandList className="p-1">
                    <CommandGroup className="p-0">
                      {STAGE_FILTERS.map((f) => {
                        const isActive = !!(f.key && stageFilters.includes(f.key));
                        return (
                          <CommandItem
                            key={String(f.key)}
                            value={f.label}
                            onSelect={() => {
                              if (!f.key) { setStageFilters([]); setStagePopoverOpen(false); return; }
                              setStageFilters((prev) => {
                                const exists = prev.includes(f.key!);
                                return exists ? prev.filter((x) => x !== f.key) : [...prev, f.key!];
                              });
                            }}
                            className={`mx-1 flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-sm font-medium transition-all duration-150 ${
                              isActive
                                ? "bg-neutral-100 text-neutral-900"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                          >
                            {f.label}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Chip de filtro ativo — estilo idêntico /kanban, /tarefas, /caixa-de-entrada */}
            {activeFilterLabels.length > 0 && (
              <div
                className="inline-flex items-center gap-2 rounded-none px-3 py-1 text-white shadow-sm text-xs"
                style={{
                  backgroundColor: "var(--color-primary)",
                  border: "1px solid var(--color-primary)",
                }}
              >
                <span className="font-semibold">Estágios</span>
                <span className="font-medium">{activeFilterLabels.join(', ')}</span>
                <button
                  type="button"
                  onClick={() => setStageFilters([])}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-none text-white transition"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    border: "1px solid transparent",
                  }}
                  aria-label="Remover filtro"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {FEATURES.exportarCsv && (
              <button
                type="button"
                onClick={() => exportAgendaCSV(dateISO, filteredCards, technicians)}
                className="h-9 shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Exportar CSV
              </button>
            )}

            <DateNavigator
              dateISO={dateISO}
              onPrev={() => handleChangeDay(-1)}
              onNext={() => handleChangeDay(1)}
              onPick={(v) => { setDateISO(v); reload(v); }}
              highlight={highlightDate}
            />

            {/* CTA Adicionar linha — estilo igual "Nova ficha" em /kanban */}
            <Button
              type="button"
              disabled={addingRow}
              onClick={handleAddFreeRow}
              className="h-9 shrink-0 bg-emerald-600 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
              style={{ paddingLeft: '18px', paddingRight: '18px', borderRadius: '10px' }}
            >
              <PlusCircle className="mr-2 size-5" />
              Adicionar linha
            </Button>
          </div>
        </div>

        {/* Legenda — alinhada à direita */}
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
            // Desabilita edição durante busca global para evitar mover entre datas
            canEdit={canEdit && !isGlobalSearch}
            highlightedIds={highlightedIds}
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
                if (typeof (patch as any).time_slots    !== "undefined") schedPatch.time_slots    = (patch as any).time_slots;
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

function exportAgendaCSV(dateISO: string, cards: ScheduleCard[], technicians: Technician[]) {
  try {
    const techMap = new Map(technicians.map((t) => [t.id, t.name]));
    const headers = ['Data','Horário(s)','Técnico','Cliente','Bairro','Tipo instalação','Stage'];
    const lines = [headers.join(',')];
    for (const c of cards) {
      const horarios = Array.isArray(c.time_slots) && c.time_slots.length > 0 ? c.time_slots.join(' e ') : c.time_slot;
      const vals = [
        dateISO,
        horarios,
        techMap.get(c.technician_id) || '',
        (c as any).cliente || '',
        (c as any).bairro || '',
        String((c as any).tipo_instalacao || ''),
        String((c as any).stage || ''),
      ].map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"');
      lines.push(vals.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-${dateISO}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {}
}
