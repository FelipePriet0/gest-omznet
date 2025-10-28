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
  blue:  { dot: "bg-[#3B82F6]", border: "border-blue-200" },
  green: { dot: "bg-[#10B981]", border: "border-emerald-200" },
  amber: { dot: "bg-[#F59E0B]", border: "border-amber-200" },
  red:   { dot: "bg-[#EF4444]", border: "border-red-200" },
  purple:{ dot: "bg-[#8B5CF6]", border: "border-violet-200" },
  orange:{ dot: "bg-[#F97316]", border: "border-orange-200" },
} as const;

export function KanbanColumn({ title, cards, color, icon, count, droppableId }: KanbanColumnProps) {
  const config = colorConfig[(color as keyof typeof colorConfig) || 'blue'];
  const { setNodeRef, isOver } = useDroppable({ id: droppableId || title.toLowerCase().replace(/\s+/g,'_') });

<<<<<<< HEAD
function formatDateUTC(iso?: string) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function KanbanColumn({ title, cards }: { title: string; cards: CardType[] }) {
  return (
    <div className="flex min-h-64 w-72 flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="text-sm font-medium">{title}</div>
      <div className="flex flex-1 flex-col gap-3">
        {cards.map((c) => (
          <div key={c.id} className="rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm transition hover:shadow dark:border-zinc-700 dark:bg-zinc-950">
            <div className="mb-1 truncate text-sm font-semibold">{c.applicantName}</div>
            <div className="text-xs text-zinc-500">{c.cpfCnpj}</div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              {c.phone && <span>Tel: {c.phone}</span>}
              {c.whatsapp && <span>Whats: {c.whatsapp}</span>}
              {c.bairro && <span>Bairro: {c.bairro}</span>}
              {c.dueAt && <span>Ag.: {formatDateUTC(c.dueAt)}</span>}
=======
  return (
    <div className="min-w-[340px] w-[340px] max-w-[360px] flex-shrink-0" ref={setNodeRef}>
      <div className={`rounded-2xl border ${config.border} bg-white shadow-sm hover:shadow-md transition-all duration-200 h-full`}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${config.dot}`} />
              <h2 className="font-semibold text-gray-800 truncate">{title}</h2>
>>>>>>> Kanban
            </div>
            <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm">{count}</span>
          </div>
        </div>
        <div className="p-4 bg-gray-50/50">
          <div className={`min-h-[140px] space-y-3 ${isOver ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-50 rounded-lg' : ''}`}>
            {cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                  <div className="h-6 w-6 rounded bg-gray-300" />
                </div>
                <p className="text-sm font-medium">Nenhuma ficha</p>
                <p className="text-xs text-gray-400">Arraste fichas aqui</p>
              </div>
            ) : (
              cards.map((c) => (
                <KanbanCard key={c.id} card={c} onOpen={() => c.onOpen?.()} onMenu={() => c.onMenu?.()} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
