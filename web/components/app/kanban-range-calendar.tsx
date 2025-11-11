"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { parseDateOnly, toDateOnlyISO } from "@/lib/datetime";
import { type DateRangeValue } from "@/components/ui/date-range-popover";

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type KanbanRangeCalendarProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  disablePast?: boolean;
};

export function KanbanRangeCalendar({ value, onChange, disablePast }: KanbanRangeCalendarProps) {
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const startDate = React.useMemo(() => parseDateOnly(value.start), [value.start]);
  const endDate = React.useMemo(() => parseDateOnly(value.end), [value.end]);

  const [month, setMonth] = React.useState(() => {
    if (endDate) return endDate;
    if (startDate) return startDate;
    return today;
  });
  const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (startDate && (!endDate || isBefore(endDate, startDate))) {
      setMonth(startDate);
    } else if (endDate) {
      setMonth(endDate);
    }
  }, [startDate, endDate]);

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

  const currentRange = React.useMemo(() => {
    if (startDate && endDate) {
      const start = isBefore(startDate, endDate) ? startDate : endDate;
      const end = isAfter(endDate, startDate) ? endDate : startDate;
      return { start, end };
    }
    return undefined;
  }, [startDate, endDate]);

  const previewRange = React.useMemo(() => {
    if (!startDate || endDate || !hoveredDate) return undefined;
    const start = isBefore(hoveredDate, startDate) ? hoveredDate : startDate;
    const end = isAfter(hoveredDate, startDate) ? hoveredDate : startDate;
    return { start, end };
  }, [startDate, endDate, hoveredDate]);

  const handleDayClick = (day: Date) => {
    if (disablePast && isBefore(day, today)) return;

    const iso = toDateOnlyISO(day);
    if (!iso) return;

    if (!startDate || (startDate && endDate)) {
      onChange({ start: iso, end: undefined });
      setHoveredDate(null);
      return;
    }

    const start = startDate;
    if (isBefore(day, start)) {
      onChange({ start: iso, end: toDateOnlyISO(start) });
    } else if (isSameDay(day, start)) {
      onChange({ start: iso, end: undefined });
    } else {
      onChange({ start: toDateOnlyISO(start), end: iso });
    }
    setHoveredDate(null);
  };

  const handleClear = () => {
    onChange({});
    setHoveredDate(null);
  };

  const isInRange = (day: Date) => {
    if (currentRange && isWithinInterval(day, currentRange)) return true;
    if (previewRange && isWithinInterval(day, previewRange)) return true;
    return false;
  };

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
          const isStart = startDate && isSameDay(day, startDate);
          const isEnd = endDate && isSameDay(day, endDate);
          const within = isInRange(day);
          const previewOnly = previewRange && within && !(currentRange && isWithinInterval(day, currentRange));
          const isRangeMiddle = within && !isStart && !isEnd;
          const isPreviewMiddle = previewOnly && !isStart && !isEnd;
          const isToday = isSameDay(day, today);

          return (
            <div key={iso} className="relative flex items-center justify-center">
              {(isRangeMiddle || isPreviewMiddle) && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-1 w-full rounded-full bg-emerald-100 transition-colors",
                    previewOnly && "bg-emerald-100/70"
                  )}
                />
              )}
              {isStart && !isEnd && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute right-[calc(50%-1px)] top-1/2 h-[calc(100%-8px)] rounded-r-full bg-emerald-100",
                    previewOnly && "bg-emerald-100/70"
                  )}
                  style={{ transform: "translateY(-50%)" }}
                />
              )}
              {isEnd && !isStart && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[calc(50%-1px)] top-1/2 h-[calc(100%-8px)] rounded-l-full bg-emerald-100",
                    previewOnly && "bg-emerald-100/70"
                  )}
                  style={{ transform: "translateY(-50%)" }}
                />
              )}
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                disabled={disabled}
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
                  outside && "text-zinc-300",
                  disabled && "cursor-not-allowed opacity-40",
                  !disabled && !outside && "cursor-pointer",
                  within && "text-emerald-700",
                  isRangeMiddle && "bg-transparent",
                  previewOnly && "text-emerald-600",
                  isStart &&
                    "bg-emerald-600 text-white shadow-[0_4px_12px_-6px_rgba(16,185,129,0.9)]",
                  isEnd &&
                    "bg-emerald-600 text-white shadow-[0_4px_12px_-6px_rgba(16,185,129,0.9)]",
                  (isStart || isEnd) && "font-semibold",
                  !disabled && !within && !outside &&
                    "hover:bg-emerald-50 hover:text-emerald-700",
                  isToday && !isStart && !isEnd && "ring-1 ring-emerald-200"
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
          {startDate ? (
            <span>
              {format(startDate, "dd/MM/yyyy")} –
              {endDate ? ` ${format(endDate, "dd/MM/yyyy")}` : " Selecionar término"}
            </span>
          ) : (
            <span>Selecione um período</span>
          )}
        </div>
        {(value.start || value.end) && (
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
