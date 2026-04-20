"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parseDateOnly, toDateOnlyISO } from "@/lib/datetime";

type DateSinglePopoverProps = {
  label?: string;
  value?: string; // yyyy-MM-dd
  onChange: (value?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePast?: boolean;
};

const dayPickerClassNames = {
  months: "flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:space-x-4",
  month: "space-y-1",
  caption: "flex justify-center pt-2 relative items-center",
  caption_label: "text-sm font-medium text-zinc-900 dark:text-zinc-100",
  nav: "space-x-1 flex items-center",
  nav_button:
    "h-8 w-8 rounded-md border border-emerald-500/30 bg-transparent text-emerald-600 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-emerald-400/30 dark:hover:bg-emerald-500/20",
  table: "w-full border-collapse space-y-1",
  head_row: "flex",
  head_cell: "w-9 rounded-md text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300",
  row: "flex w-full mt-2",
  cell: "h-9 w-9 text-center text-sm p-0 relative",
  day: cn(
    "h-9 w-9 rounded-md text-sm text-zinc-900 transition-colors dark:text-zinc-100",
    "hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-200"
  ),
  day_selected:
    "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white",
  day_outside: "pointer-events-none text-zinc-300 opacity-50 dark:text-zinc-600",
  day_disabled: "pointer-events-none text-zinc-300 opacity-50 dark:text-zinc-600",
  day_today: "border border-emerald-400 text-emerald-600 font-semibold",
};

export function DateSinglePopover({ label, value, onChange, placeholder, disabled, disablePast }: DateSinglePopoverProps) {
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
              "mt-1 flex h-12 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-5 py-3 text-left text-sm text-zinc-900 shadow-sm outline-none transition dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
              "focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <span className="truncate">{formatted}</span>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
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
        <PopoverContent className="w-auto rounded-xl border-0 bg-white p-0 shadow-md dark:bg-zinc-950" align="start" sideOffset={8}>
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) { onChange(undefined); return; }
              onChange(toDateOnlyISO(date));
              setOpen(false);
            }}
            numberOfMonths={1}
            classNames={dayPickerClassNames}
            disabled={disablePast ? { before: new Date() } : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
