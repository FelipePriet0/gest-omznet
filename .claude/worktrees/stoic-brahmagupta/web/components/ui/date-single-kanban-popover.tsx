"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parseDateOnly } from "@/lib/datetime";
import { KanbanSingleCalendar } from "@/components/app/kanban-single-calendar";
import { format } from "date-fns";

type DateSingleKanbanPopoverProps = {
  label?: string;
  value?: string; // yyyy-MM-dd
  onChange: (value?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePast?: boolean;
};

export function DateSingleKanbanPopover({ label, value, onChange, placeholder, disabled, disablePast }: DateSingleKanbanPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = React.useMemo(() => parseDateOnly(value), [value]);
  const formatted = React.useMemo(() => (selectedDate ? format(selectedDate, "dd/MM/yyyy") : (placeholder || "Selecionar data")), [selectedDate, placeholder]);

  return (
    <div className="w-full space-y-2">
      {label && <Label className="field-label text-h1">{label}</Label>}
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "mt-1 flex h-12 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-5 py-3 text-left text-sm text-zinc-900 shadow-sm outline-none transition",
              "focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <span className="truncate">{formatted}</span>
            <div className="flex items-center gap-2 text-zinc-500">
              {selectedDate && (
                <X
                  className="h-4 w-4 hover:text-emerald-600 transition"
                  role="button"
                  aria-label="Limpar data"
                  onClick={(event) => { event.stopPropagation(); onChange(undefined); }}
                />
              )}
              <CalendarIcon className="h-4 w-4" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-0 shadow-md bg-white rounded-xl" align="start" sideOffset={8}>
          <KanbanSingleCalendar
            value={value}
            onChange={(v) => { onChange(v); setOpen(false); }}
            disablePast={disablePast}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
