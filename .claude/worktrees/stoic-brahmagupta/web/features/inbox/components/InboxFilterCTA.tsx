"use client";

import { useState } from "react";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import type { InboxFilterOption } from "@/features/inbox/types";

const inboxFilterLabels: Record<InboxFilterOption, string> = {
  mentions: "Menções",
  parecer: "Respostas em parecer",
  comentarios: "Respostas em comentários",
};

export function InboxFilterCTA({ value, onSelect }: { value: InboxFilterOption | null; onSelect: (value: InboxFilterOption) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          className="transition-all duration-200 group h-6 text-xs items-center rounded-sm flex gap-1.5 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ListFilter className="size-3 shrink-0 transition-all text-muted-foreground group-hover:text-neutral-700" />
          Filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-white border-0 shadow-lg rounded-lg">
        <Command className="rounded-lg">
          <CommandList className="p-1">
            <CommandGroup className="p-0">
              {(
                [
                  { value: "mentions", label: inboxFilterLabels.mentions },
                  { value: "parecer", label: inboxFilterLabels.parecer },
                  { value: "comentarios", label: inboxFilterLabels.comentarios },
                ] as const
              ).map((option) => (
                <CommandItem
                  key={option.value}
                  className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1"
                  value={option.label}
                  onSelect={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const inboxFilterLabelsMap = inboxFilterLabels;
