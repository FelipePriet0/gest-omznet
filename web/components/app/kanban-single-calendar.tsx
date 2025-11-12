"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { parseDateOnly, toDateOnlyISO } from "@/lib/datetime";

type KanbanSingleCalendarProps = {
  value?: string; // yyyy-MM-dd
  onChange: (value?: string) => void;
  disablePast?: boolean;
};

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function KanbanSingleCalendar({ value, onChange, disablePast }: KanbanSingleCalendarProps) {
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const selected = React.useMemo(() => parseDateOnly(value), [value]);

  const [month, setMonth] = React.useState(() => selected || today);

  React.useEffect(() => {
    if (selected) setMonth(selected);
  }, [selected]);

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const monthLabel = React.useMemo(() => {
    const label = format(month, "MMMM yyyy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [month]);

  const handleDayClick = (day: Date) => {
    if (disablePast && isBefore(day, today)) return;
    onChange(toDateOnlyISO(day));
  };

  const handleClear = () => onChange(undefined);

  return (
    <div className="relative flex w-[320px] flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl shadow-emerald-900/5 ring-1 ring-emerald-500/5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1"
          onClick={() => setMonth((prev) => subMonths(prev, 1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="select-none text-base font-semibold text-zinc-900 tracking-tight capitalize">
          {monthLabel}
        </div>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1"
          onClick={() => setMonth((prev) => addMonths(prev, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-sm">
        {days.map((day) => {
          const iso = toDateOnlyISO(day);
          const disabled = disablePast && isBefore(day, today);
          const outside = !isSameMonth(day, month);
          const isSelected = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, today);

          return (
            <div key={iso} className="relative flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={disabled}
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
                  outside && "text-zinc-300",
                  disabled && "cursor-not-allowed opacity-40",
                  !disabled && !outside && "cursor-pointer",
                  isSelected && "bg-emerald-600 text-white shadow-[0_4px_12px_-6px_rgba(16,185,129,0.9)] font-semibold",
                  !disabled && !isSelected && !outside && "hover:bg-emerald-50 hover:text-emerald-700",
                  isToday && !isSelected && "ring-1 ring-emerald-200"
                )}
              >
                <span>{format(day, "d", { locale: ptBR })}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50/80 px-4 py-3 text-xs text-emerald-700">
        <div className="flex items-center gap-2 font-medium">
          <CalendarIcon className="h-4 w-4" />
          {selected ? (
            <span>{format(selected, "dd/MM/yyyy")}</span>
          ) : (
            <span>Selecione uma data</span>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-emerald-700 transition hover:bg-emerald-100"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

