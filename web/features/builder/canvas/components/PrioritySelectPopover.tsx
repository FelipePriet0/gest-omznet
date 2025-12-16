"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
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

  const searchableOptions = useMemo(() => options.map((o) => ({ key: o, label: o })), [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-9 w-full rounded-[6px] bg-black pl-3 pr-10 text-left text-sm transition",
              "hover:bg-black",
              isPlaceholder ? "text-white/85" : "text-white"
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

      <PopoverContent className="w-[260px] p-0 bg-white border-0 shadow-lg rounded-lg" side="bottom" align="start" sideOffset={6}>
        <Command className="rounded-lg">
          <CommandList className="p-1">
            <CommandGroup className="p-0">
              {searchableOptions.map((opt) => {
                const selected = opt.key === value;
                return (
                  <CommandItem
                    key={opt.key}
                    value={opt.label}
                    className={cn(
                      "group flex gap-3 items-center px-2 py-2 text-gray-700 transition-all duration-150 cursor-pointer rounded-sm mx-1",
                      "hover:bg-black hover:text-white",
                      selected ? "bg-black text-white" : ""
                    )}
                    onSelect={() => {
                      onChange(opt.key);
                      setOpen(false);
                    }}
                  >
                    <span className="w-4 flex items-center justify-center">
                      <Check className={cn("h-4 w-4", selected ? "text-white opacity-100" : "opacity-0")} />
                    </span>
                    <span className="text-sm font-medium truncate">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
