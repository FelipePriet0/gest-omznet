"use client";

import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";
import "react-day-picker/dist/style.css";

type DateRangePickerProps = {
  start?: string;
  end?: string;
  onChange: (start?: string, end?: string) => void;
};

export function DateRangePicker({ start, end, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  
  const selected: DateRange | undefined = start && end 
    ? { from: new Date(start), to: new Date(end) }
    : start 
    ? { from: new Date(start), to: undefined }
    : undefined;

  function handleSelect(range: DateRange | undefined) {
    if (range?.from) {
      onChange(toYMD(range.from), range.to ? toYMD(range.to) : undefined);
      if (range.to) {
        setOpen(false);
      }
    } else {
      onChange(undefined, undefined);
    }
  }

  function formatRange(from?: Date, to?: Date) {
    if (!from) return "Período de avaliação";
    if (!to) return `${formatDate(from)} - ...`;
    return `${formatDate(from)} - ${formatDate(to)}`;
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-11 w-full justify-start text-left font-normal rounded-lg border-gray-200 hover:border-gray-300 hover:bg-white shadow-sm"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
          <span className={selected?.from ? "text-gray-700" : "text-gray-400"}>
            {formatRange(selected?.from, selected?.to)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          locale={ptBR}
          toDate={new Date()}
          className="p-3"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium text-gray-900",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-sm transition-colors hover:bg-gray-100",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-100/50 [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md transition-colors",
            day_range_start: "day-range-start",
            day_range_end: "day-range-end",
            day_selected: "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white rounded-md",
            day_today: "bg-gray-100 text-gray-900 font-semibold",
            day_outside: "day-outside text-gray-400 opacity-50 aria-selected:bg-gray-100/50 aria-selected:text-gray-500 aria-selected:opacity-30",
            day_disabled: "text-gray-400 opacity-50",
            day_range_middle: "aria-selected:bg-gray-100 aria-selected:text-gray-900 rounded-none",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}
