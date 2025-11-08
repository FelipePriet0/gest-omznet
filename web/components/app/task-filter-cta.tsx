"use client";

import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListFilter } from "lucide-react";
import { useMemo, useState } from "react";

import { DateRangePopover } from "@/components/ui/date-range-popover";

interface TaskFilterCTAProps {
  q: string;
  setQ: (value: string) => void;
  status: 'all' | 'pending' | 'completed';
  setStatus: (value: 'all' | 'pending' | 'completed') => void;
  due: 'all' | 'hoje' | 'amanha' | 'atrasado' | 'intervalo';
  setDue: (value: 'all' | 'hoje' | 'amanha' | 'atrasado' | 'intervalo') => void;
  ds: string;
  setDs: (value: string) => void;
  de: string;
  setDe: (value: string) => void;
  onApply: (nextStatus?: 'all' | 'pending' | 'completed') => void;
  loading: boolean;
}

export function TaskFilterCTA({
  q, setQ, status, setStatus, due, setDue, ds, setDs, de, setDe, onApply, loading
}: TaskFilterCTAProps) {
  const [open, setOpen] = useState(false);
  const rangeValue = useMemo(() => ({ start: ds || undefined, end: de || undefined }), [ds, de]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
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
              <CommandItem
                className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1"
                value="Todos"
                onSelect={() => { setStatus('all'); onApply('all'); setOpen(false); }}
              >
                <span className="text-sm font-medium">Todos</span>
              </CommandItem>
              <CommandItem
                className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1"
                value="Pendentes"
                onSelect={() => { setStatus('pending'); onApply('pending'); setOpen(false); }}
              >
                <span className="text-sm font-medium">Pendentes</span>
              </CommandItem>
              <CommandItem
                className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1"
                value="Concluídas"
                onSelect={() => { setStatus('completed'); onApply('completed'); setOpen(false); }}
              >
                <span className="text-sm font-medium">Concluídas</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup className="p-0">
              <CommandItem
                className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1"
                value="prazo-all"
                onSelect={() => {
                  setDue("all");
                  setDs("");
                  setDe("");
                  onApply();
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium">Todos os prazos</span>
              </CommandItem>
              <CommandItem
                className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1"
                value="prazo-hoje"
                onSelect={() => {
                  setDue("hoje");
                  setDs("");
                  setDe("");
                  onApply();
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium">Hoje</span>
              </CommandItem>
              <CommandItem
                className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1"
                value="prazo-amanha"
                onSelect={() => {
                  setDue("amanha");
                  setDs("");
                  setDe("");
                  onApply();
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium">Amanhã</span>
              </CommandItem>
              <CommandItem
                className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1"
                value="prazo-atrasado"
                onSelect={() => {
                  setDue("atrasado");
                  setDs("");
                  setDe("");
                  onApply();
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium">Atrasados</span>
              </CommandItem>
            </CommandGroup>
            <div className="px-2 pb-2">
              <DateRangePopover
                label="Intervalo"
                value={rangeValue}
                onChange={(next) => {
                  const hasStart = !!next.start;
                  setDue(hasStart ? "intervalo" : "all");
                  setDs(next.start ?? "");
                  setDe(next.end ?? "");
                  onApply();
                  setOpen(false);
                }}
              />
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
