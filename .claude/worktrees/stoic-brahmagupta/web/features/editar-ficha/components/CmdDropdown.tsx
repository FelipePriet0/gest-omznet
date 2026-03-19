"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, RefreshCcw, ClipboardList, Paperclip, Search } from "lucide-react";

export function CmdDropdown({ items, onPick, initialQuery }: { items: { key: string; label: string }[]; onPick: (key: string) => void | Promise<void>; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery || "");
  useEffect(() => setQ(initialQuery || ""), [initialQuery]);
  const iconFor = (key: string) => {
    if (key === "aprovado") return <CheckCircle className="w-4 h-4" />;
    if (key === "negado") return <XCircle className="w-4 h-4" />;
    if (key === "reanalise") return <RefreshCcw className="w-4 h-4" />;
    if (key === "tarefa") return <ClipboardList className="w-4 h-4" />;
    if (key === "anexo") return <Paperclip className="w-4 h-4" />;
    return null;
  };
  const filtered = items.filter((i) => i.key.includes(q) || i.label.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 10);
  return (
    <div className="cmd-dropdown w-[260px] rounded-md border border-zinc-200 bg-white p-2 shadow-md">
      <div className="relative mb-2">
        <Search className="absolute left-2 top-2 h-4 w-4 text-zinc-400" />
        <input
          className="w-full rounded border border-zinc-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-zinc-300"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar..."
        />
      </div>
      <div className="max-h-48 overflow-auto">
        {filtered.map((it) => (
          <button
            key={it.key}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-50"
            onClick={() => onPick(it.key)}
          >
            {iconFor(it.key)}
            <span>{it.label}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-zinc-500">Sem comandos</div>
        )}
      </div>
    </div>
  );
}

