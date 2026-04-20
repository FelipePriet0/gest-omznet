"use client";

import * as React from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parseDateOnly, toDateOnlyISO } from "@/lib/datetime";
import { KanbanRangeCalendar } from "@/components/app/kanban-range-calendar";

export type DateRangeValue = { start?: string; end?: string };

type DateRangePopoverProps = {
  label?: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePast?: boolean;
  variant?: "default" | "kanban";
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
  day_range_start: "rounded-l-md bg-emerald-600 text-white",
  day_range_end: "rounded-r-md bg-emerald-600 text-white",
  day_range_middle: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
};

function formatLabel(value: DateRangeValue, placeholder?: string) {
  const { start, end } = value;
  if (!start && !end) return placeholder || "Selecionar período";
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (startDate && endDate) {
    return `${format(startDate, "dd/MM/yyyy")} – ${format(endDate, "dd/MM/yyyy")}`;
  }
  if (startDate) {
    return format(startDate, "dd/MM/yyyy");
  }
  return placeholder || "Selecionar período";
}

export function DateRangePopover({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  disablePast,
  variant = "default",
}: DateRangePopoverProps) {
  const [open, setOpen] = React.useState(false);
  const selectedRange = React.useMemo<DateRange | undefined>(() => {
    const start = parseDateOnly(value.start);
    const end = parseDateOnly(value.end);
    if (!start && !end) return undefined;
    return { from: start, to: end };
  }, [value.start, value.end]);

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
            <span className="truncate">{formatLabel(value, placeholder)}</span>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              {(value.start || value.end) && (
                <X
                  className="h-4 w-4 hover:text-emerald-600 transition"
                  role="button"
                  aria-label="Limpar período"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange({});
                  }}
                />
              )}
              <CalendarIcon className="h-4 w-4" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-auto p-0 border-0",
            variant === "kanban" ? "bg-transparent shadow-none" : "rounded-xl bg-white shadow-md dark:bg-zinc-950"
          )}
          align="start"
          sideOffset={8}
        >
          {variant === "kanban" ? (
            <KanbanRangeCalendar
              value={value}
              disablePast={disablePast}
              onChange={(next) => {
                onChange(next);
                if (next.start && next.end) setOpen(false);
              }}
            />
          ) : (
            <DayPicker
              mode="range"
              locale={ptBR}
              selected={selectedRange}
              onSelect={(range) => {
                if (!range?.from) {
                  onChange({});
                  return;
                }
                const next: DateRangeValue = {
                  start: toDateOnlyISO(range.from),
                  end: range.to ? toDateOnlyISO(range.to) : undefined,
                };
                onChange(next);
                if (range.to) {
                  setOpen(false);
                }
              }}
              numberOfMonths={1}
              classNames={dayPickerClassNames}
              disabled={disablePast ? { before: new Date() } : undefined}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

