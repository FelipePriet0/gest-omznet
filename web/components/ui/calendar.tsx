"use client";

import * as React from "react";

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

function daysInMonth(year: number, monthIdx: number) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const today = React.useMemo(() => new Date(), []);
  const [view, setView] = React.useState<Date>(() => selected ? new Date(selected) : new Date());

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const totalDays = daysInMonth(year, month);

  const prevMonthDays = daysInMonth(year, month - 1);

  // Build 6 weeks (42 cells)
  const cells: { d: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startWeekday + 1; // relative to first day
    if (dayNum < 1) {
      // previous month
      cells.push({ d: new Date(year, month - 1, prevMonthDays + dayNum), inMonth: false });
    } else if (dayNum > totalDays) {
      // next month
      cells.push({ d: new Date(year, month + 1, dayNum - totalDays), inMonth: false });
    } else {
      cells.push({ d: new Date(year, month, dayNum), inMonth: true });
    }
  }

  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekdayShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; // simples

  const selectedKey = React.useMemo(() => {
    if (!selected) return null;
    const y = selected.getFullYear();
    const m = selected.getMonth();
    const d = selected.getDate();
    return `${y}-${m}-${d}`;
  }, [selected]);

  function keyFor(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  return (
    <div className={[
      "rounded-xl bg-white shadow-sm p-3 w-[260px]",
      className || "",
    ].join(" ")}
    >
      <div className="flex items-center justify-between mb-2">
        <button aria-label="Previous month" className="h-8 w-8 flex items-center justify-center rounded-md text-[var(--verde-primario)] hover:bg-[var(--verde-primario)]/10" onClick={() => setView(new Date(year, month - 1, 1))}>‹</button>
        <div className="text-sm font-semibold text-zinc-900 capitalize">{monthLabel}</div>
        <button aria-label="Next month" className="h-8 w-8 flex items-center justify-center rounded-md text-[var(--verde-primario)] hover:bg-[var(--verde-primario)]/10" onClick={() => setView(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-zinc-500 mb-1">
        {weekdayShort.map((w) => (<div key={w} className="py-1">{w}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map(({ d, inMonth }, idx) => {
          const isSelected = selectedKey ? keyFor(d) === selectedKey : false;
          const isToday = keyFor(d) === keyFor(today);
          const base = "mx-auto h-8 w-8 flex items-center justify-center rounded text-sm";
          const state = isSelected
            ? "bg-[var(--verde-primario)] text-white"
            : inMonth
              ? "text-[var(--verde-primario)] hover:bg-[var(--verde-primario)]/40"
              : "text-[color:rgba(1,137,66,0.35)]";
          return (
            <button
              key={idx}
              disabled={!inMonth}
              className={[base, state].join(" ")}
              onClick={() => { onSelect?.(new Date(d)); }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";
