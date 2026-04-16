"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

async function loadFullSlots(dateISO: string): Promise<Set<string>> {
  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const { data } = await supabase.rpc("get_agenda_availability", {
      p_date_from: dateISO,
      p_date_to: dateISO,
    });
    const full = new Set<string>();
    for (const row of (data as any[]) || []) {
      if (Number(row.tech_count) > 0 && Number(row.booked_count) >= Number(row.tech_count)) {
        full.add(row.slot as string);
      }
    }
    return full;
  } catch {
    return new Set();
  }
}

export function TimeMultiSelect({
  label,
  labelClassName,
  times,
  value,
  onApply,
  className,
  triggerClassName,
  allowedPairs,
  date,
}: {
  label: string;
  labelClassName?: string;
  times: readonly string[]; // 'HH:MM'
  value: string[]; // selected 'HH:MM'
  onApply: (vals: string[]) => void;
  className?: string;
  triggerClassName?: string;
  allowedPairs?: [string, string][]; // ex: [["08:30","10:30"],["13:30","15:30"]]
  date?: string; // yyyy-MM-dd — usado para buscar slots cheios
}) {
  const [open, setOpen] = React.useState(false);
  const [sel, setSel] = React.useState<string[]>([]);
  const [fullSlots, setFullSlots] = React.useState<Set<string>>(new Set());

  React.useEffect(() => { setSel(value ?? []); }, [value, open]);

  // Buscar slots cheios quando o popover abre
  React.useEffect(() => {
    if (!open || !date) { setFullSlots(new Set()); return; }
    loadFullSlots(date).then(setFullSlots);
  }, [open, date]);

  function isStart(v: string) {
    return (allowedPairs || []).some(p => p[0] === v);
  }
  function isEnd(v: string) {
    return (allowedPairs || []).some(p => p[1] === v);
  }
  function pairForStart(v: string): [string,string] | undefined {
    return (allowedPairs || []).find(p => p[0] === v);
  }
  function normalizeSelection(arr: string[]): string[] {
    if (arr.length !== 2) return arr;
    for (const [a,b] of (allowedPairs || [])) {
      if (arr.includes(a) && arr.includes(b)) return [a,b];
    }
    return arr;
  }

  function toggle(v: string) {
    setSel((prev) => {
      const has = prev.includes(v);
      if (has) return prev.filter((x) => x !== v);
      if (prev.length === 0) return [v];
      if (prev.length === 1) {
        const first = prev[0];
        if (isEnd(first)) return prev;
        const pair = pairForStart(first);
        if (!pair) return prev;
        if (v === pair[1]) return normalizeSelection([first, v]);
        return prev;
      }
      return prev;
    });
  }

  const labelText = sel.length === 0 ? "Selecionar horário"
    : sel.length === 1 ? sel[0]
    : normalizeSelection(sel)[0] + " e " + normalizeSelection(sel)[1];

  return (
    <div className={className}>
      <div className="w-full space-y-2">
        <div className={labelClassName ?? "field-label text-h1"}>{label}</div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={triggerClassName
                ? `flex w-full items-center justify-between text-left outline-none ${triggerClassName}`
                : "mt-1 flex h-12 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-5 py-3 text-left text-sm text-zinc-900 shadow-none outline-none focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20"
              }
              style={triggerClassName ? undefined : { boxShadow: "0 1px 4px rgba(24, 50, 71, 0.08)" }}
            >
              <span className="truncate">{labelText}</span>
              <span aria-hidden className="ml-2 inline-block align-middle" style={{ color: 'var(--verde-primario)', transform: 'rotate(90deg)' }}>&gt;</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-[260px] p-2 bg-white border border-zinc-200 shadow-md rounded-md mz-time-popover">
            <div className="space-y-1">
              {times.map((t) => {
                const active = sel.includes(t);
                const isFull = fullSlots.has(t) && !active;
                const fullTitle = isFull
                  ? `Não há mais vagas para esse horário no dia ${date ? date.split("-").reverse().join("/") : ""}`
                  : undefined;

                let disabled = isFull;
                if (!active && !isFull) {
                  if (sel.length >= 2) disabled = true;
                  else if (sel.length === 1) {
                    const first = sel[0];
                    if (isEnd(first)) disabled = true;
                    else {
                      const pair = pairForStart(first);
                      disabled = !pair || t !== pair[1];
                    }
                  }
                }

                const btn = (
                  <button
                    key={t}
                    onClick={() => !disabled && toggle(t)}
                    disabled={disabled}
                    className={[
                      "group w-full flex items-center justify-between rounded-sm px-2 py-2 text-sm mz-time-item",
                      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      active ? "bg-[var(--verde-primario)] text-white mz-time-item--active" : "text-zinc-800 hover:bg-[var(--verde-primario)] hover:text-white",
                      isFull ? "bg-zinc-100 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-400" : "",
                    ].join(" ")}
                  >
                    <span className="group-hover:text-white mz-time-label">{t}</span>
                    <span
                      className={[
                        "ml-auto inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm border mz-time-checkbox",
                        "group-hover:border-white",
                      ].join(" ")}
                      style={{ borderColor: active ? 'white' : isFull ? '#d4d4d8' : 'var(--verde-primario)' }}
                    >
                      {active && (
                        <svg viewBox="0 0 24 24" width="14" height="14" className="group-hover:text-white" style={{ color: 'white' }}>
                          <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                );

                // Botões disabled não disparam hover — envolver num span com tooltip customizado
                return isFull ? (
                  <span key={t} className="relative block w-full cursor-not-allowed group/full">
                    {btn}
                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 z-50 hidden group-hover/full:block w-max max-w-[220px] rounded-md bg-white border border-zinc-200 px-2.5 py-1.5 text-center text-xs leading-snug text-zinc-700 shadow-lg">
                      {fullTitle}
                    </span>
                  </span>
                ) : btn;
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-600">
                {sel.length === 0 ? "Nenhum selecionado" : sel.length === 1 ? sel[0] : `${sel[0]} e ${sel[1]}`}
              </div>
              <div className="flex gap-2">
                <button
                  className="text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200"
                  onClick={() => setSel([])}
                  type="button"
                >Limpar</button>
                <button
                  className="text-xs px-2 py-1 rounded bg-[var(--verde-primario)] text-white hover:opacity-90"
                  onClick={() => { onApply(sel.slice(0, 2)); setOpen(false); }}
                  type="button"
                >Aplicar</button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
