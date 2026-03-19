"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function RouteMultiSelectPopover({
  values,
  options,
  placeholder,
  onChange,
  onClear,
}: {
  values: string[];
  options: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => new Set(values), [values]);
  const hasSelection = values.length > 0;
  const label = placeholder;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((o) => o.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-9 w-full rounded-[6px] bg-[var(--verde-primario)] pl-3 pr-10 text-left text-sm text-white transition",
              "hover:brightness-95"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <ChevronsUpDown className="h-4 w-4 text-white" />
              <span className="truncate">{label}</span>
            </span>
          </button>
        </PopoverTrigger>

        <button
          type="button"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-[6px] text-white/90 hover:bg-white/15 hover:text-white",
            hasSelection ? "" : "pointer-events-none opacity-0"
          )}
          aria-label="Limpar rotas"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
        >
          ×
        </button>
      </div>

      <PopoverContent
        className="w-[260px] p-1 bg-white border-0 shadow-lg rounded-lg"
        side="bottom"
        align="start"
        sideOffset={6}
      >
        <div className="px-1 pb-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar bairro..."
            className="h-9 w-full rounded-[6px] border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-[var(--verde-primario)]"
          />
        </div>
        <div
          role="listbox"
          aria-label="Selecionar rotas"
          aria-multiselectable="true"
          className="flex max-h-[216px] flex-col overflow-auto"
          style={{ direction: "rtl" }}
        >
          <div style={{ direction: "ltr" }} className="flex flex-col">
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-500">Nenhum bairro encontrado</div>
            )}

            {filteredOptions.map((opt) => {
            const isSelected = selected.has(opt);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "group flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-sm mx-1",
                  "transition-all duration-150 cursor-pointer",
                  isSelected
                    ? "bg-[var(--verde-primario)] !text-white"
                    : "text-gray-700 hover:bg-[var(--verde-primario)] hover:text-white"
                )}
                onClick={() => {
                  const nextSelected = new Set(values);
                  if (nextSelected.has(opt)) nextSelected.delete(opt);
                  else nextSelected.add(opt);

                  const next = options.filter((o) => nextSelected.has(o));
                  onChange(next);
                }}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-5 w-5 shrink-0 rounded-[6px] border flex items-center justify-center",
                    isSelected
                      ? "border-white bg-white/15"
                      : "border-zinc-300 bg-white group-hover:border-white group-hover:bg-white/15"
                  )}
                >
                  <Check className={cn("h-4 w-4", isSelected ? "!text-white opacity-100" : "opacity-0")} />
                </span>
                <span className={cn("truncate", isSelected ? "!text-white" : "")}>{opt}</span>
              </button>
            );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
