import { KanbanCard as CardType } from "@/features/kanban/types";

interface KanbanColumnProps {
  title: string;
  cards: CardType[];
  color: string;
  icon: string;
  count: number;
}

const colorConfig = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    header: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    header: "bg-green-500",
    badge: "bg-green-100 text-green-800",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    header: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-800",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    header: "bg-red-500",
    badge: "bg-red-100 text-red-800",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    header: "bg-purple-500",
    badge: "bg-purple-100 text-purple-800",
  },
};

export function KanbanColumn({ title, cards, color, icon, count }: KanbanColumnProps) {
  const config = colorConfig[color as keyof typeof colorConfig] || colorConfig.blue;
  
  return (
    <div className={`flex min-h-[200px] w-[280px] sm:w-[320px] lg:w-[340px] flex-col gap-3 rounded-2xl border ${config.border} ${config.bg} p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow flex-shrink-0`}>
      <div className={`flex items-center justify-between rounded-lg ${config.header} px-2 sm:px-3 py-2`}>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-base sm:text-lg">{icon}</span>
          <span className="text-xs sm:text-sm font-semibold text-white truncate">{title}</span>
        </div>
        <div className={`rounded-full px-1.5 sm:px-2 py-1 text-xs font-medium ${config.badge} flex-shrink-0`}>
          {count}
        </div>
      </div>
      
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {cards.map((card) => (
          <div key={card.id} className="rounded-lg border border-gray-200 bg-white p-2 sm:p-3 text-sm shadow-sm transition-all hover:shadow-md hover:border-gray-300">
            <div className="mb-1 sm:mb-2 truncate text-xs sm:text-sm font-semibold text-gray-900">{card.applicantName}</div>
            <div className="mb-1 sm:mb-2 text-xs text-gray-600">{card.cpfCnpj}</div>
            <div className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 text-xs text-gray-500">
              {card.phone && <span className="truncate">Tel: {card.phone}</span>}
              {card.whatsapp && <span className="truncate">Whats: {card.whatsapp}</span>}
              {card.bairro && <span className="truncate">Bairro: {card.bairro}</span>}
              {card.dueAt && <span className="truncate">Ag.: {new Date(card.dueAt).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
        
        {cards.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-gray-400">
            Nenhum card nesta coluna
          </div>
        )}
      </div>
    </div>
  );
}

