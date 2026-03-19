"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function PrioritySelectPopover({
  value,
  options,
  placeholder,
  onChange,
  onRemove,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (next: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value?.trim().length ? value : placeholder;
  const isPlaceholder = !value?.trim().length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-9 w-full rounded-[6px] bg-[var(--verde-primario)] pl-3 pr-10 text-left text-sm text-white transition",
              "hover:brightness-95",
              isPlaceholder ? "" : ""
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
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-[6px] text-white/90 hover:bg-white/15 hover:text-white"
          aria-label="Remover prioridade"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
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
        <div role="listbox" aria-label="Selecionar prioridade" className="flex flex-col">
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "group flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-sm mx-1",
                  "transition-all duration-150 cursor-pointer",
                  selected
                    ? "bg-[var(--verde-primario)] !text-white"
                    : "text-gray-700 hover:bg-[var(--verde-primario)] hover:text-white"
                )}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <span className="w-4 flex items-center justify-center">
                  <Check className={cn("h-4 w-4", selected ? "text-white opacity-100" : "opacity-0")} />
                </span>
                <span className={cn("truncate", selected ? "!text-white" : "")}>{opt}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
