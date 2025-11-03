"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";

export function CalendarReady({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (yyyyMmDd: string) => void; placeholder?: string }) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value + "T00:00:00") : undefined;

  function toYmd(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  return (
    <div className="w-full space-y-2">
      <Label className="field-label text-h1">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-1 flex h-12 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-5 py-3 text-left text-sm text-zinc-900 shadow-sm outline-none focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20"
          >
            <span className="truncate">{date ? date.toLocaleDateString() : (placeholder || "Selecionar data")}</span>
            <CalendarIcon className="ml-2 h-4 w-4 text-zinc-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-transparent border-0 shadow-none" align="start" sideOffset={6}>
          <Calendar
            selected={date}
            onSelect={(d) => {
              if (!d) return;
              const ymd = toYmd(d);
              onChange(ymd);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
