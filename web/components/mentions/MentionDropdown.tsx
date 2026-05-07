"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ProfileLite } from "@/lib/profiles";

type Props = {
  items: ProfileLite[];
  onPick: (p: ProfileLite) => void;
  excludeIds?: string[];
};

function normalizeRole(input?: string | null): string {
  const s = (input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!s) return "outros";
  if (s === "gestor" || s === "gestao" || s === "gerente") return "gestor";
  if (s === "analista" || s === "analise") return "analista";
  if (s === "vendedor" || s === "vendas" || s === "comercial") return "vendedor";
  // Variações comuns para equipe de instalação
  if (s === "instalador" || s === "instalacao" || s === "instalacao" || s === "instala" || s === "tecnico" || s === "tecnico de instalacao") return "instalador";
  return "outros";
}

export default function MentionDropdown({ items, onPick, excludeIds }: Props) {
  const [q, setQ] = useState("");
  const listboxId = useId();
  const filtered = useMemo(() => {
    const exclude = new Set(excludeIds || []);
    return (items || []).filter((p) => !exclude.has(p.id) && (p.full_name || "").toLowerCase().includes(q.toLowerCase()));
  }, [items, q, excludeIds]);

  const order: Array<{ key: string; label: string }> = [
    { key: "gestor", label: "Gestor" },
    { key: "analista", label: "Analista" },
    { key: "vendedor", label: "Vendedor" },
    { key: "instalador", label: "Instalador" },
    { key: "outros", label: "Outros" },
  ];

  const grouped = useMemo(() => {
    const buckets = new Map<string, ProfileLite[]>();
    order.forEach(({ key }) => buckets.set(key, []));
    filtered.forEach((p) => {
      const k = normalizeRole(p.role);
      const key = buckets.has(k) ? k : "outros";
      buckets.get(key)!.push(p);
    });
    return buckets;
  }, [filtered]);

  const hasAny = useMemo(() => Array.from(grouped.values()).some((arr) => arr.length > 0), [grouped]);

  const firstId = (filtered[0]?.id ? `mention-opt-${filtered[0].id}` : undefined);
  const srOnly = { position:'absolute', width:'1px', height:'1px', padding:0, margin:'-1px', overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap', border:0 } as React.CSSProperties;

  return (
    <div className="cmd-menu-dropdown mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow" role="listbox" aria-label="Sugestões de menção" id={listboxId} aria-activedescendant={firstId}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input role="combobox" aria-autocomplete="list" aria-controls={listboxId} aria-expanded={true} aria-activedescendant={firstId} value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar pessoas…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
        <div style={srOnly} aria-live="polite">{filtered.length} resultado{filtered.length===1?'':'s'}</div>
      </div>
      {!hasAny ? (
        <div className="px-3 py-2 text-zinc-500">Sem resultados</div>
      ) : (
        order.map(({ key, label }) => {
          const list = grouped.get(key) || [];
          if (list.length === 0) return null;
          return (
            <div key={key} className="py-1">
              <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">{label}</div>
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  role="option"
                  id={`mention-opt-${p.id}`}
                  className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-zinc-50"
                >
                  <span>{p.full_name}{p.role ? ` (${p.role})` : ''}</span>
                </button>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
