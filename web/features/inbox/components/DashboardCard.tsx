"use client";

import * as React from "react";
import type { ReactNode } from "react";

export function DashboardCard({ title, value, icon, onClick, active }: { title: string; value?: number | null; icon?: ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-[120px] w-full rounded-[12px] border bg-white border-zinc-200 shadow-sm overflow-hidden flex flex-col transition",
        active ? "ring-2 ring-[var(--color-primary)]" : "hover:shadow-md",
      ].join(" ")}
    >
      <div className="bg-[#000000] px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-medium text-white text-left truncate">{title}</div>
        {icon && <div className="text-white">{icon}</div>}
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-3xl font-bold text-[var(--verde-primario)] tabular-nums">{typeof value === 'number' ? value : '—'}</div>
      </div>
    </button>
  );
}

