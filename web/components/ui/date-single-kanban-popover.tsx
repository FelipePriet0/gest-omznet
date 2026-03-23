"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { endOfMonth, startOfMonth } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parseDateOnly } from "@/lib/datetime";
import { KanbanSingleCalendar } from "@/components/app/kanban-single-calendar";
import { format } from "date-fns";

const ALL_SLOTS = ["08:30", "10:30", "13:30", "15:30"];

async function loadFullDays(month: Date): Promise<Set<string>> {
  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to   = format(endOfMonth(month),   "yyyy-MM-dd");
    const { data } = await supabase.rpc("get_agenda_availability", {
      p_date_from: from,
      p_date_to: to,
    });
    if (!data) return new Set();

    // Agrupar slots por dia
    const byDay = new Map<string, { booked: number; total: number }[]>();
    for (const row of data as any[]) {
      const list = byDay.get(row.date_iso) ?? [];
      list.push({ booked: Number(row.booked_count), total: Number(row.tech_count) });
      byDay.set(row.date_iso, list);
    }

    // Um dia está cheio quando TODOS os 4 slots estão cheios
    const full = new Set<string>();
    for (const [dateISO, slots] of byDay.entries()) {
      const allFull =
        slots.length >= ALL_SLOTS.length &&
        slots.every((s) => s.total > 0 && s.booked >= s.total);
      if (allFull) full.add(dateISO);
    }
    return full;
  } catch {
    return new Set();
  }
}

type DateSingleKanbanPopoverProps = {
  label?: string;
  value?: string; // yyyy-MM-dd
  onChange: (value?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePast?: boolean;
  triggerClassName?: string;
};

export function DateSingleKanbanPopover({ label, value, onChange, placeholder, disabled, disablePast, triggerClassName }: DateSingleKanbanPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [fullDays, setFullDays] = React.useState<Set<string>>(new Set());
  const [displayMonth, setDisplayMonth] = React.useState<Date>(() => parseDateOnly(value) || new Date());

  const selectedDate = React.useMemo(() => parseDateOnly(value), [value]);
  const formatted = React.useMemo(() => (selectedDate ? format(selectedDate, "dd/MM/yyyy") : (placeholder || "Selecionar data")), [selectedDate, placeholder]);

  // Buscar disponibilidade quando o popover abre ou o mês exibido muda
  React.useEffect(() => {
    if (!open) return;
    loadFullDays(displayMonth).then(setFullDays);
  }, [open, displayMonth]);

  return (
    <div className="w-full space-y-2">
      {label && <Label className="field-label text-h1">{label}</Label>}
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "mt-1 flex w-full items-center justify-between border border-zinc-300 bg-white text-left text-sm text-zinc-900 shadow-sm outline-none transition",
              "focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20",
              disabled && "cursor-not-allowed opacity-60",
              triggerClassName || "h-12 rounded-lg px-5 py-3"
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
            fullDays={fullDays}
            onMonthChange={(m) => setDisplayMonth(m)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
