"use client";

import * as React from "react";

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const value = React.useMemo(() => {
    if (!selected) return "";
    const y = selected.getFullYear();
    const m = String(selected.getMonth() + 1).padStart(2, "0");
    const d = String(selected.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selected]);

  return (
    <div className={["p-2", className || ""].join(" ")}> 
      <input
        type="date"
        value={value}
        onChange={(e) => {
          const v = e.currentTarget.value;
          if (!v) { onSelect?.(undefined); return; }
          const d = new Date(v + "T00:00:00");
          onSelect?.(d);
        }}
        className="w-[260px] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20"
      />
    </div>
  );
}

Calendar.displayName = "Calendar";
