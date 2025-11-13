"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Phone, MessageCircle, MapPin, Calendar } from "lucide-react";
import { KanbanColumn } from "@/legacy/components/kanban/components/KanbanColumn";
import { KanbanCard } from "@/features/kanban/types";
import { listCards, changeStage } from "@/features/kanban/services";
import { supabase } from "@/lib/supabaseClient";
import { MoveModal } from "@/legacy/components/kanban/components/MoveModal";
import { EditarFichaModal } from "@/features/editar-ficha/EditarFichaModal";
import { CancelModal } from "@/legacy/components/kanban/components/CancelModal";

const columns = [
  { key: "recebidos", title: "Recebidos", color: "blue", icon: "🔵" },
  { key: "em_analise", title: "Em Análise", color: "orange", icon: "🟠" },
  { key: "reanalise", title: "Reanálise", color: "amber", icon: "🟡" },
  { key: "aprovados", title: "Aprovados", color: "green", icon: "🟢" },
  { key: "negados", title: "Negados", color: "red", icon: "🔴" },
  { key: "ass_app", title: "Ass App", color: "green", icon: "🟢" },
  { key: "finalizados", title: "Finalizados", color: "purple", icon: "🟣" },
  { key: "canceladas", title: "Canceladas", color: "red", icon: "🔴" },
];

export function KanbanBoardAnalise({
  hora,
  dateStart,
  dateEnd,
  openCardId,
  responsaveis,
  onCardsChange,
  onCardModalClose,
}: {
  hora?: string;
  dateStart?: string;
  dateEnd?: string;
  openCardId?: string;
  responsaveis?: string[];
  onCardsChange?: (cards: KanbanCard[]) => void;
  onCardModalClose?: () => void;
}) {
  const router = useRouter();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [move, setMove] = useState<{ id: string; area: "comercial" | "analise" } | null>(null);
  const [cancel, setCancel] = useState<{ id: string; area: "comercial" | "analise" } | null>(null);
  const hScrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  
  const [edit, setEdit] = useState<{ cardId: string; applicantId?: string }|null>(null);
  const lastClosedCardIdRef = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string|null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const responsavelIds = useMemo(
    () => (responsaveis ?? []).filter((id) => typeof id === "string" && id.length > 0),
    [responsaveis]
  );

  const reload = useCallback(async () => {
    try {
      const data = await listCards("analise", {
        hora,
        dateStart,
        dateEnd,
        responsaveis: responsavelIds,
      });
      setCards(data);
      onCardsChange?.(data);
    } catch (error) {
      console.error("Falha ao carregar cards do Kanban Análise:", error);
      setCards([]);
      onCardsChange?.([]);
    }
  }, [hora, dateStart, dateEnd, responsavelIds, onCardsChange]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const channelKey = `kanban-analise-${hora || "_"}-${dateStart || "_"}-${dateEnd || "_"}-${responsavelIds.join("|") || "_"}`;
    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kanban_cards",
          filter: "area=eq.analise",
        },
        () => {
          void reload();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.error("Erro ao remover canal do Kanban Análise:", err);
      }
    };
  }, [hora, dateStart, dateEnd, responsavelIds, reload]);

  const grouped = useMemo(() => {
    const g: Record<string, KanbanCard[]> = {
      recebidos: [],
      em_analise: [],
      reanalise: [],
      aprovados: [],
      negados: [],
      ass_app: [],
      finalizados: [],
      canceladas: [],
    };
    for (const c of cards) {
      const k = (c.stage || "").toLowerCase();
      if (g[k as keyof typeof g]) g[k as keyof typeof g].push(c);
    }
    return g;
  }, [cards]);

  useEffect(() => {
    if (!openCardId) {
      lastClosedCardIdRef.current = null;
      return;
    }
    if (lastClosedCardIdRef.current === openCardId) {
      return;
    }
    const c = cards.find((x) => x.id === openCardId);
    if (c) setEdit({ cardId: c.id, applicantId: c.applicantId });
  }, [openCardId, cards]);

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id as string;
    const target = over.id as string;
    if (target === "canceladas") { setCancel({ id: cardId, area: "analise" }); return; }
    try {
      await changeStage(cardId, "analise", target);
      await reload();
    } catch (e: any) {
      alert(e.message ?? "Falha ao mover");
    }
  }

  function openCard(c: KanbanCard) {
    if (c.applicantId) router.push(`/ficha/${c.applicantId}`);
  }

  function extraForRecebidos(c: KanbanCard) {
    return (
      <div className="mt-3">
        <button
          onClick={async () => {
            try {
              await changeStage(c.id, "analise", "em_analise");
              await reload();
            } catch (e: any) {
              alert(e.message ?? "Não foi possível ingressar");
            }
          }}
          className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          Ingressar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <DndContext
        sensors={sensors}
        autoScroll
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={(event)=> { setActiveId(null); handleDragEnd(event); }}
      >
        <div ref={hScrollRef} data-kanban-hscroll="analise" className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hide-h-scrollbar">
          <div ref={contentRef} data-kanban-content="analise" className="flex items-start gap-6 min-h-[200px] w-max pr-6 pb-4">
          {columns.map((c) => (
            <KanbanColumn
              key={c.key}
              droppableId={c.key}
              title={c.title}
              color={c.color}
              icon={c.icon}
              count={(grouped[c.key as keyof typeof grouped] || []).length}
              cards={(grouped[c.key as keyof typeof grouped] || []).map((card) => ({
                ...card,
                onOpen: () => setEdit({ cardId: card.id, applicantId: card.applicantId }),
                onMenu: () => setMove({ id: card.id, area: 'analise' }),
                extraAction: c.key === "recebidos" ? extraForRecebidos(card) : undefined,
              }))}
            />
          ))}
          </div>
        </div>
        {/* Removed internal proxy; page-level proxy provides a single bar */}
        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
          {activeId ? (
            (() => { const c = cards.find(x=> x.id===activeId); if (!c) return null; return (
              <div className="rounded-2xl border border-emerald-100/40 bg-white p-3 shadow-[0_6px_16px_rgba(30,41,59,0.06)] pointer-events-none">
                <div className="mb-0.5 truncate text-[13px] font-semibold text-zinc-900">{c.applicantName}</div>
                <div className="text-[11px] text-zinc-500">CPF: {c.cpfCnpj}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-700">
                  {c.phone && (
                    <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-zinc-400" />{c.phone}</span>
                  )}
                  {c.whatsapp && (
                    <span className="inline-flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-zinc-400" />WhatsApp</span>
                  )}
                  {c.bairro && (
                    <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-zinc-400" />Bairro: {c.bairro}</span>
                  )}
                  {c.dueAt && (
                    <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-zinc-400" />Ag.: {new Date(c.dueAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ); })()
          ) : null}
        </DragOverlay>
      </DndContext>
      <MoveModal
        open={!!move}
        onClose={() => setMove(null)}
        cardId={move?.id || ""}
        presetArea={move?.area}
        onMoved={reload}
      />
      <CancelModal
        open={!!cancel}
        onClose={() => setCancel(null)}
        cardId={cancel?.id || ""}
        area="analise"
        onCancelled={reload}
      />
      
      <EditarFichaModal
        open={!!edit}
        onClose={() => {
          if (edit?.cardId) {
            lastClosedCardIdRef.current = edit.cardId;
          }
          setEdit(null);
          onCardModalClose?.();
        }}
        cardId={edit?.cardId || ''}
        applicantId={edit?.applicantId || ''}
        onStageChange={reload}
      />
    </div>
  );
}
