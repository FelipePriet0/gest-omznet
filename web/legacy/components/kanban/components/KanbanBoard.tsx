"use client";

import { KanbanColumn } from "@/legacy/components/kanban/components/KanbanColumn";
import { EditarFichaModal } from "@/features/editar-ficha/EditarFichaModal";
import { KanbanCard } from "@/features/kanban/types";
import { useEffect, useMemo, useState } from "react";
import { listCards, changeStage } from "@/features/kanban/services";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Phone, MessageCircle, MapPin, Calendar } from "lucide-react";
import { MoveModal } from "@/legacy/components/kanban/components/MoveModal";
import { CancelModal } from "@/legacy/components/kanban/components/CancelModal";

const columnConfig = [
  { key: "entrada", title: "Entrada", color: "blue", icon: "🔵" },
  { key: "feitas", title: "Feitas", color: "green", icon: "🟢" },
  { key: "aguardando", title: "Aguardando", color: "amber", icon: "🟡" },
  { key: "canceladas", title: "Canceladas", color: "red", icon: "🔴" },
  { key: "concluidas", title: "Concluídas", color: "purple", icon: "🟣" },
];

export function KanbanBoard({ hora, prazo, date, openCardId }: { hora?: string; prazo?: 'hoje'|'amanha'|'atrasado'|'data'; date?: string; openCardId?: string }) {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [move, setMove] = useState<{id: string, area: 'comercial' | 'analise'}|null>(null);
  const [cancel, setCancel] = useState<{id: string, area: 'comercial' | 'analise'}|null>(null);
  
  const [activeId, setActiveId] = useState<string|null>(null);
  const sensors = useSensors(
    // Estilo Trello: ativa drag após mover uma distância; clique curto abre
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  
  const [edit, setEdit] = useState<{ cardId: string; applicantId?: string }|null>(null);

  useEffect(() => { (async () => { try { setCards(await listCards('comercial', { hora, prazo, date })); } catch {} })(); }, [hora, prazo, date]);

  const grouped = useMemo(() => {
    const g: Record<string, KanbanCard[]> = { entrada:[], feitas:[], aguardando:[], canceladas:[], concluidas:[] };
    for (const c of cards) { const k = (c.stage||'').toLowerCase(); if (g[k as keyof typeof g]) g[k as keyof typeof g].push(c); }
    return g;
  }, [cards]);

  useEffect(() => {
    if (!openCardId) return;
    const c = cards.find((x) => x.id === openCardId);
    if (c) setEdit({ cardId: c.id, applicantId: c.applicantId });
  }, [openCardId, cards]);

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id as string;
    const target = over.id as string;
    if (target === 'entrada') { alert('Entrada não recebe cards.'); return; }
    if (target === 'canceladas') { setCancel({ id: cardId, area: 'comercial' }); return; }
    try { await changeStage(cardId, 'comercial', target); setCards(await listCards('comercial')); } catch (e:any) { alert(e.message ?? 'Falha ao mover'); }
  }

  function openMenu(c: KanbanCard) { setMove({ id: c.id, area: 'comercial' }); }

  return (
    <div className="relative">
      <DndContext
        sensors={sensors}
        autoScroll
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={(event)=> { setActiveId(null); handleDragEnd(event); }}
      >
        <div className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="flex items-start gap-6 min-h-[200px] w-max pr-6 pb-4">
            {columnConfig.map((column) => (
              <KanbanColumn
                key={column.key}
                droppableId={column.key}
                title={column.title}
                cards={(grouped[column.key as keyof typeof grouped] || []).map(c => ({...c, onOpen: ()=> setEdit({ cardId: c.id, applicantId: c.applicantId }), onMenu: ()=>openMenu(c)}))}
                color={column.color}
                icon={column.icon}
                count={(grouped[column.key as keyof typeof grouped] || []).length}
              />
            ))}
          </div>
        </div>
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
      <MoveModal open={!!move} onClose={()=>setMove(null)} cardId={move?.id||''} presetArea={move?.area} onMoved={async ()=> setCards(await listCards('comercial', { hora, prazo, date }))} />
      <CancelModal open={!!cancel} onClose={()=>setCancel(null)} cardId={cancel?.id||''} area="comercial" onCancelled={async ()=> setCards(await listCards('comercial', { hora, prazo, date }))} />
      
      <EditarFichaModal open={!!edit} onClose={()=> setEdit(null)} cardId={edit?.cardId||''} applicantId={edit?.applicantId||''} />
    </div>
  );
}
