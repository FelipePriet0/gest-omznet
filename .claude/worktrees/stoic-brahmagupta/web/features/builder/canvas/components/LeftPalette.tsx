"use client";

import { MapPinned, UserRoundCog, BadgeAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { CanvasNodeType } from "../types";

export function LeftPalette({
  onCreate,
}: {
  onCreate: (type: CanvasNodeType) => void;
}) {
  const item = (type: CanvasNodeType, label: string, icon: ReactNode) => {
    return (
      <button
        key={type}
        type="button"
        onClick={() => onCreate(type)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-5 py-3 text-left transition hover:bg-zinc-100"
      >
        <span className="h-8 w-8 rounded-[6px] bg-black flex items-center justify-center text-white">
          {icon}
        </span>
        <span className="text-emerald-700 font-semibold text-base">{label}</span>
      </button>
    );
  };

  return (
    <aside className="pointer-events-auto absolute left-6 top-[99px] z-30 h-[650px] w-[240px] rounded-[26px] border border-black/5 bg-white pb-6 pt-[26px] shadow-lg">
      <div className="flex flex-col gap-2">
        {item("technician", "Técnico", <UserRoundCog className="h-4 w-4" />)}
        {item("priority", "Prioridade", <BadgeAlert className="h-4 w-4" />)}
        {item("route", "Rota", <MapPinned className="h-4 w-4" />)}
      </div>
    </aside>
  );
}
