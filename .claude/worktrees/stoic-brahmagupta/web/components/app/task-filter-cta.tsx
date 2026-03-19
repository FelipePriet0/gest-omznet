"use client";

import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListFilter } from "lucide-react";
import { useState } from "react";

type StatusValue = "all" | "pending" | "completed";

interface TaskFilterCTAProps {
  status: StatusValue;
  setStatus: (value: StatusValue) => void;
  onApply: (nextStatus?: StatusValue) => void;
}

const statusOptions: Array<{ value: StatusValue; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "completed", label: "Concluídas" },
];

export function TaskFilterCTA({ status, setStatus, onApply }: TaskFilterCTAProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (next: StatusValue) => {
    setStatus(next);
    onApply(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          className="group flex h-6 items-center gap-1.5 rounded-sm text-xs transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ListFilter className="size-3 shrink-0 text-muted-foreground transition-all group-hover:text-neutral-700" />
          Filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] rounded-lg border-0 bg-white p-0 shadow-lg">
        <Command className="rounded-lg">
          <CommandList className="p-1">
            <CommandGroup className="p-0">
              {statusOptions.map((option) => {
                const isActive = status === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    className={`mx-1 flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {option.label}
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
