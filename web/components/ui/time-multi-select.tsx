"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TimeMultiSelect({
  label,
  times,
  value,
  onApply,
  className,
  allowedPairs,
}: {
  label: string;
  times: string[]; // 'HH:MM'
  value: string[]; // selected 'HH:MM'
  onApply: (vals: string[]) => void;
  className?: string;
  allowedPairs?: [string, string][]; // ex: [["08:30","10:30"],["13:30","15:30"]]
}) {
  const [open, setOpen] = React.useState(false);
  const [sel, setSel] = React.useState<string[]>([]);
  React.useEffect(() => { setSel(value ?? []); }, [value, open]);

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
      // regras de mesclagem
      if (prev.length === 0) {
        // primeiro clique só permite começar por inícios válidos, mas permitimos também escolha única de qualquer horário
        // porém, para permitir mesclar depois, apenas inícios (start) destravam um segundo valor
        return [v];
      }
      if (prev.length === 1) {
        const first = prev[0];
        // se o primeiro é um fim de par, não permite adicionar outro (ordem importa)
        if (isEnd(first)) return prev;
        const pair = pairForStart(first);
        if (!pair) return prev; // não há par permitido para esse primeiro
        // só permite o segundo se for o fim correspondente
        if (v === pair[1]) return normalizeSelection([first, v]);
        return prev;
      }
      // já temos 2
      return prev;
    });
  }
  const labelText = sel.length === 0 ? "Selecionar horário"
    : sel.length === 1 ? sel[0]
    : normalizeSelection(sel)[0] + " e " + normalizeSelection(sel)[1];

  return (
    <div className={className}>
      <div className="w-full space-y-2">
        <div className="field-label text-h1">{label}</div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="mt-1 flex h-12 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-5 py-3 text-left text-sm text-zinc-900 shadow-none outline-none focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20"
              style={{ boxShadow: "0 1px 4px rgba(24, 50, 71, 0.08)" }}
            >
              <span className="truncate">{labelText}</span>
              <span aria-hidden className="ml-2 inline-block align-middle" style={{ color: 'var(--verde-primario)', transform: 'rotate(90deg)' }}>&gt;</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-[260px] p-2 bg-white border border-zinc-200 shadow-md rounded-md mz-time-popover">
            <div className="space-y-1">
              {times.map((t) => {
                const active = sel.includes(t);
                let disabled = false;
                if (!active) {
                  if (sel.length >= 2) disabled = true;
                  else if (sel.length === 1) {
                    const first = sel[0];
                    // se o primeiro é fim de par, não pode adicionar outro
                    if (isEnd(first)) disabled = true;
                    else {
                      const pair = pairForStart(first);
                      disabled = !pair || t !== pair[1];
                    }
                  }
                }
                return (
                  <button
                    key={t}
                    onClick={() => toggle(t)}
                    disabled={disabled}
                    className={[
                      "group w-full flex items-center justify-between rounded-sm px-2 py-2 text-sm mz-time-item",
                      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      active ? "bg-[var(--verde-primario)] text-white mz-time-item--active" : "text-zinc-800 hover:bg-[var(--verde-primario)] hover:text-white",
                    ].join(" ")}
                  >
                    <span className="group-hover:text-white mz-time-label">{t}</span>
                    <span
                      className={[
                        "ml-auto inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm border mz-time-checkbox",
                        "group-hover:border-white",
                      ].join(" ")}
                      style={{ borderColor: active ? 'white' : 'var(--verde-primario)' }}
                    >
                      {active && (
                        <svg viewBox="0 0 24 24" width="14" height="14" className="group-hover:text-white" style={{ color: 'white' }}>
                          <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
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
