"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { KanbanColumn } from "@/features/kanban/components/KanbanColumn";
import { KanbanCard } from "@/features/kanban/types";
import { listCards, changeStage } from "@/features/kanban/services";
import { MoveModal } from "@/features/kanban/components/MoveModal";
import { DeleteFlow } from "@/features/kanban/components/DeleteModals";

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

export function KanbanBoardAnalise() {
  const router = useRouter();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [move, setMove] = useState<{ id: string; area: "comercial" | "analise" } | null>(null);
  const [del, setDel] = useState<{ id: string; name: string; cpf: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCards(await listCards("analise"));
      } catch {}
    })();
  }, []);

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

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id as string;
    const target = over.id as string;
    if (target === "canceladas") {
      setMove({ id: cardId, area: "analise" });
      return;
    }
    try {
      await changeStage(cardId, "analise", target);
      setCards(await listCards("analise"));
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
              setCards(await listCards("analise"));
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
    <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 overflow-x-auto overflow-y-visible pb-2 -mx-2 px-2">
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex w-full flex-1 gap-4 sm:gap-6 pb-4 min-w-max">
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
                onOpen: () => openCard(card),
                onMenu: () => setDel({ id: card.id, name: card.applicantName, cpf: card.cpfCnpj }),
                extraAction: c.key === "recebidos" ? extraForRecebidos(card) : undefined,
              }))}
            />
          ))}
        </div>
      </DndContext>
      <MoveModal
        open={!!move}
        onClose={() => setMove(null)}
        cardId={move?.id || ""}
        presetArea={move?.area}
        onMoved={async () => setCards(await listCards("analise"))}
      />
      <DeleteFlow
        open={!!del}
        onClose={() => setDel(null)}
        cardId={del?.id || ""}
        applicantName={del?.name || ""}
        cpfCnpj={del?.cpf || ""}
        onDeleted={async () => setCards(await listCards("analise"))}
      />
    </div>
  );
}
