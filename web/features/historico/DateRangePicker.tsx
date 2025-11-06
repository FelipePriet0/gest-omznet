"use client";

import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_green.css";
import { Portuguese } from "flatpickr/dist/l10n/pt.js";

type DateRangePickerProps = {
  start?: string;
  end?: string;
  onChange: (start?: string, end?: string) => void;
};

export function DateRangePicker({ start, end, onChange }: DateRangePickerProps) {
  const [selected, setSelected] = useState<Date[]>([]);

  useEffect(() => {
    const values: Date[] = [];
    if (start) values.push(new Date(start));
    if (end) values.push(new Date(end));
    setSelected(values);
  }, [start, end]);

  function handleChange(dates: Date[]) {
    setSelected(dates);
    const [from, to] = dates;
    onChange(from ? toYMD(from) : undefined, to ? toYMD(to) : undefined);
  }

  return (
    <div className="relative w-full">
      <Flatpickr
        value={selected}
        onChange={handleChange}
        options={{
          mode: "range",
          locale: Portuguese,
          dateFormat: "Y-m-d",
          maxDate: "today",
        }}
        placeholder="Período de avaliação"
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition-all duration-200 hover:border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4m-9 4h10m-9 4h10m-9 4h10M5 21h14a2 2 0 0 0 2-2V7H3v12a2 2 0 0 0 2 2Z"
          />
        </svg>
      </div>
    </div>
  );
}

function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}
