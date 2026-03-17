"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, Filter as FilterIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { AgendaGrid } from "./components/AgendaGrid";
import { DateNavigator } from "./components/DateNavigator";
import { Legend } from "./components/Legend";
import { TIME_SLOTS } from "./mock";
import { getLatestPublishedWorkflow } from "@/features/builder/services";
import type { CanvasWorkflowState } from "@/features/builder/canvas/types";
import { suggestAssignment } from "./matching";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fetchAgendaTechnicians, fetchAgendaCardsByDate, updateScheduleCard, clearScheduleCard, updateApplicant, validateMove, createApplicant, createScheduleCard } from "./services";
import type { ScheduleCard, Technician } from "./types";

export function AgendaPage() {
  // Decisão de produto: qualquer role pode editar a Agenda
  const canEdit = true;

  const [dateISO, setDateISO] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [cards, setCards] = useState<ScheduleCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [createSignal, setCreateSignal] = useState<number | undefined>(undefined);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  // Removidos filtros avançados (área / responsável / prazo / horário). Mantemos apenas busca simples.
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; description?: string; onConfirm?: () => Promise<void> | void }>({ open: false, title: "" });
  const [stagePopoverOpen, setStagePopoverOpen] = useState(false);

  async function reload(dayISO: string) {
    setLoading(true);
    try {
      const [techs, cs] = await Promise.all([
        fetchAgendaTechnicians(),
        fetchAgendaCardsByDate(dayISO),
      ]);
      setTechnicians(techs);
      setCards(cs as any);
    } finally {
      setLoading(false);
    }
  }

  // Carregar dados iniciais ao montar
  useEffect(() => {
    reload(dateISO).catch((e) => console.error('Falha ao carregar agenda', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [query, setQuery] = useState<string>("");

  // Quando trocar a data, por enquanto usamos um mock limpo
  const handleChangeDay = (delta: number) => {
    const d = new Date(dateISO + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    setDateISO(next);
    reload(next);
  };

  const slots = useMemo(() => TIME_SLOTS, []);
  const [wfState, setWfState] = useState<CanvasWorkflowState | null>(null);
  const [defaultTechIdState, setDefaultTechIdState] = useState<string | undefined>(undefined);
  const [defaultSlotState, setDefaultSlotState] = useState<string | undefined>(undefined);

  // Load latest published workflow (for auto-suggest defaults)
  useEffect(() => {
    (async () => {
      try {
        const wf = await getLatestPublishedWorkflow();
        setWfState((wf?.state as any) || null);
      } catch {}
    })();
  }, []);

  async function doMove(cardId: string, d: string, techId: string, time: string) {
    await validateMove({ id: cardId, dateISO: d, technician_id: techId, time_slot: time })
      .then(() => updateScheduleCard({ id: cardId, dateISO: d, technician_id: techId, time_slot: time }))
      .then(() => reload(d))
      .catch((e) => {
        console.error('Falha ao mover agendamento', e);
        alert(e?.message || 'Movimento inválido pelas regras do Builder.');
      });
  }

  const onDragEnd = (ev: DragEndEvent) => {
    if (!canEdit) return; // UI-only guard, atualmente sempre true
    const cardId = String(ev.active?.id || "");
    if (!cardId || cardId.startsWith('tmp-')) return; // ignorar itens temporários não persistidos
    const overId = ev.over?.id ? String(ev.over.id) : null;
    if (!cardId || !overId) return;
    // overId formato: cell::<date>::<techId>::<time>
    if (!overId.startsWith("cell::")) return;
    const [_c, d, techId, time] = overId.split("::");
    const techName = technicians.find(t => t.id === techId)?.name || 'técnico';
    setConfirm({
      open: true,
      title: `Mover para ${techName} · ${time}`,
      description: `Confirma mover este agendamento para ${d}?`,
      onConfirm: () => doMove(cardId, d, techId, time),
    });
  };

  // When user hits "+ Novo horário", prepare default tech/slot suggestion
  useEffect(() => {
    if (!createSignal) return;
    try {
      const { technician_id, time_slot } = suggestAssignment({
        workflow: wfState || null,
        technicians,
        dateISO,
        cards,
        applicantBairro: null,
        tipoInstalacao: null,
        timeSlots: slots,
      });
      setDefaultTechIdState(technician_id || technicians.find((t)=>t.active)?.id || technicians[0]?.id);
      setDefaultSlotState(time_slot || slots[0]);
    } catch {
      setDefaultTechIdState(technicians.find((t)=>t.active)?.id || technicians[0]?.id);
      setDefaultSlotState(slots[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createSignal]);

  // Derived filters
  const filteredCards = useMemo(() => {
    let list = cards as any[];
    const term = (query || '').toLowerCase();
    if (term) list = list.filter((c) => (c.cliente || '').toLowerCase().includes(term));
    if (stageFilter) {
      if (stageFilter === 'comercial') list = list.filter((c) => ((c as any).area || '') === 'comercial');
      else list = list.filter((c) => (((c as any).stage || '') as string).toLowerCase() === stageFilter);
    }
    return list as ScheduleCard[];
  }, [cards, query, stageFilter]);

  // Dashboard removido a pedido

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-white/40 bg-[var(--neutro)] px-3 pb-4 pt-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
        {/* Esquerda: Data + setas + filtro (funil) */}
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
                { key: null, label: 'Todos' },
                { key: 'comercial', label: 'Comercial' },
                { key: 'em_analise', label: 'Em Análise' },
                { key: 'aprovados', label: 'Aprovado' },
                { key: 'negados', label: 'Negado' },
                { key: 'reanalise', label: 'Reanálise' },
              ].map((f) => (
                <button
                  key={String(f.key)}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition ${stageFilter === f.key ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-zinc-100 text-zinc-800'}`}
                  onClick={() => { setStageFilter(f.key as any); setStagePopoverOpen(false); }}
                >
                  {f.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        {/* Direita: busca + novo horário */}
        <div className="flex items-center gap-3">
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
          {canEdit && (
            <button type="button" className="btn-primary-mznet" onClick={() => setCreateSignal(Date.now())}>
              + Novo horário
            </button>
          )}
        </div>

        </div>

        {/* Segunda linha: apenas legenda (filtros removidos) */}
        <div className="mt-3 flex items-center gap-3">
          {!canEdit && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--verde-primario)]">
              Visualização somente leitura — sua role não permite modificar agendamentos.
            </div>
          )}
          <div className="ml-auto">
            <Legend />
          </div>
        </div>
      </div>
      {/* Aviso movido para a linha acima junto da legenda */}
      <DndContext onDragEnd={onDragEnd}>
        <AgendaGrid
          dateISO={dateISO}
          technicians={technicians}
          slots={slots}
          cards={filteredCards}
          canEdit={canEdit}
          createSignal={createSignal}
          defaultTechId={defaultTechIdState || technicians.find(t => t.active)?.id}
          defaultSlot={defaultSlotState || slots[0]}
          onCreate={(payload) => {
            setCards((prev) => [...prev, payload]);
          }}
          onUpdate={async (id, patch) => {
            try {
              // patch pode conter tecnico/slot/tipo_instalacao/cliente/bairro
              const card = cards.find((c) => c.id === id) as any;
              if (!card) return;
              // Criação de novo agendamento (id temporário)
              if (id.startsWith('tmp-')) {
                const cliente = (patch as any).cliente ?? card?.cliente ?? '';
                const bairro = (patch as any).bairro ?? card?.bairro ?? null;
                const technician_id = (patch as any).technician_id ?? card?.technician_id ?? '';
                const time_slot = (patch as any).time_slot ?? card?.time_slot ?? '';
                const tipo_instalacao = (patch as any).tipo_instalacao ?? card?.tipo_instalacao ?? null;
                const app = await createApplicant({ primary_name: cliente, bairro });
                await createScheduleCard({ applicant_id: app.id, dateISO: card.date, technician_id, time_slot, tipo_instalacao });
                await reload(dateISO);
                return;
              }
              const promises: Promise<any>[] = [];
              if (typeof (patch as any).cliente !== 'undefined' || typeof (patch as any).bairro !== 'undefined') {
                promises.push(updateApplicant(card.applicant_id, { primary_name: (patch as any).cliente, bairro: (patch as any).bairro }));
              }
              const schedPatch: any = {};
              if (typeof (patch as any).technician_id !== 'undefined') schedPatch.technician_id = (patch as any).technician_id;
              if (typeof (patch as any).time_slot !== 'undefined') schedPatch.time_slot = (patch as any).time_slot;
              if (typeof (patch as any).tipo_instalacao !== 'undefined') schedPatch.tipo_instalacao = (patch as any).tipo_instalacao;
              if (Object.keys(schedPatch).length > 0) promises.push(updateScheduleCard({ id, ...schedPatch }));
              await Promise.all(promises);
              await reload(dateISO);
            } catch (e) { console.error('Falha ao salvar agendamento', e); }
          }}
          onDelete={async (id) => {
            try {
              setConfirm({
                open: true,
                title: 'Excluir agendamento',
                description: 'Esta ação irá remover o agendamento deste horário.',
                onConfirm: async () => {
                  if (id.startsWith('tmp-')) {
                    setCards((prev) => prev.filter((c) => c.id !== id));
                    return;
                  }
                  await clearScheduleCard(id);
                  await reload(dateISO);
                },
              });
            } catch (e) { console.error('Falha ao limpar agendamento', e); }
          }}
        />
      </DndContext>
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        onCancel={() => setConfirm((s) => ({ ...s, open: false }))}
        onConfirm={async () => { try { await confirm.onConfirm?.(); } finally { setConfirm((s) => ({ ...s, open: false })); } }}
      />
    </div>
  );
}
