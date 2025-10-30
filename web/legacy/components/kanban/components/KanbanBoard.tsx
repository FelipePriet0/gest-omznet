"use client";

import { KanbanColumn } from "@/features/kanban/components/KanbanColumn";
import { EditarFichaModal } from "@/features/editar-ficha/EditarFichaModal";
import { KanbanCard } from "@/features/kanban/types";
import { useEffect, useMemo, useState } from "react";
import { listCards, changeStage } from "@/features/kanban/services";
import { DndContext } from "@dnd-kit/core";
import { MoveModal } from "@/features/kanban/components/MoveModal";
import { DeleteFlow } from "@/features/kanban/components/DeleteModals";
import { QuickActionsModal } from "@/features/kanban/components/QuickActionsModal";

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
  const [del, setDel] = useState<{id:string,name:string,cpf:string}|null>(null);
  const [actions, setActions] = useState<{id:string,name:string,cpf:string}|null>(null);
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
    if (target === 'canceladas') { setMove({ id: cardId, area: 'comercial' }); return; }
    try { await changeStage(cardId, 'comercial', target); setCards(await listCards('comercial')); } catch (e:any) { alert(e.message ?? 'Falha ao mover'); }
  }

  function openMenu(c: KanbanCard) { setActions({ id: c.id, name: c.applicantName, cpf: c.cpfCnpj }); }

  return (
    <div className="relative">
      <DndContext onDragEnd={handleDragEnd}>
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
      </DndContext>
      <MoveModal open={!!move} onClose={()=>setMove(null)} cardId={move?.id||''} presetArea={move?.area} onMoved={async ()=> setCards(await listCards('comercial', { hora, prazo, date }))} />
      <DeleteFlow open={!!del} onClose={()=>setDel(null)} cardId={del?.id||''} applicantName={del?.name||''} cpfCnpj={del?.cpf||''} onDeleted={async ()=> setCards(await listCards('comercial', { hora, prazo, date }))} />
      <QuickActionsModal
        open={!!actions}
        onClose={() => setActions(null)}
        onMove={() => { if(actions) setMove({ id: actions.id, area: 'comercial' }); setActions(null); }}
        onDelete={() => { if(actions) setDel(actions); setActions(null); }}
      />
      <EditarFichaModal open={!!edit} onClose={()=> setEdit(null)} cardId={edit?.cardId||''} applicantId={edit?.applicantId||''} />
    </div>
  );
}
