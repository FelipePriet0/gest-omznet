import { KanbanCard as CardType } from "@/features/kanban/types";

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
              {c.dueAt && <span>Ag.: {new Date(c.dueAt).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

