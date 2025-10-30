import { useDroppable } from "@dnd-kit/core";
import { KanbanCard as CardType } from "@/features/kanban/types";
import { KanbanCard } from "@/features/kanban/components/KanbanCard";

interface KanbanColumnProps {
  title: string;
  cards: CardType[];
  color: string;
  icon: string;
  count: number;
  droppableId?: string;
}

const colorConfig = {
  blue: { dot: "bg-[#3B82F6]", border: "border-blue-200" },
  green: { dot: "bg-[#10B981]", border: "border-emerald-200" },
  amber: { dot: "bg-[#F59E0B]", border: "border-amber-200" },
  red: { dot: "bg-[#EF4444]", border: "border-red-200" },
  purple: { dot: "bg-[#8B5CF6]", border: "border-violet-200" },
  orange: { dot: "bg-[#F97316]", border: "border-orange-200" },
} as const;

export function KanbanColumn({ title, cards, color, icon, count, droppableId }: KanbanColumnProps) {
  const config = colorConfig[(color as keyof typeof colorConfig) || "blue"];
  const { setNodeRef, isOver } = useDroppable({ id: droppableId || title.toLowerCase().replace(/\s+/g, "_") });

  return (
    <div className="min-w-[340px] w-[340px] max-w-[360px] flex-shrink-0" ref={setNodeRef}>
      <div className={`rounded-2xl border ${config.border} bg-white shadow-sm hover:shadow-md transition-all duration-200 h-full`}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${config.dot}`} />
              <h2 className="font-semibold text-gray-800 truncate">{title}</h2>
            </div>
            <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm">{count}</span>
          </div>
        </div>
        <div className="p-4 bg-gray-50/50">
          <div className={`min-h-[140px] space-y-3 ${isOver ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-50 rounded-lg" : ""}`}>
            {cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                  <div className="h-6 w-6 rounded bg-gray-300" />
                </div>
                <p className="text-sm font-medium">Nenhuma ficha</p>
                <p className="text-xs text-gray-400">Arraste fichas aqui</p>
              </div>
            ) : (
              cards.map((c) => <KanbanCard key={c.id} card={c} onOpen={() => c.onOpen?.()} onMenu={() => c.onMenu?.()} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
