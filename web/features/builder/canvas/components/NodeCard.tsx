"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Trash2, UserRoundCog, BadgeAlert, MapPinned, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasNode, PortId } from "../types";

function iconForType(type: CanvasNode["type"]) {
  if (type === "technician") return <UserRoundCog className="h-4 w-4" />;
  if (type === "priority") return <BadgeAlert className="h-4 w-4" />;
  if (type === "route") return <MapPinned className="h-4 w-4" />;
  return <Type className="h-4 w-4" />;
}

function labelForType(type: CanvasNode["type"]) {
  if (type === "technician") return "Técnico";
  if (type === "priority") return "Prioridade";
  if (type === "route") return "Rota";
  return "Texto";
}

export function NodeCard({
  node,
  selected,
  onSelect,
  onDelete,
  onPointerDown,
  onPortClick,
  onSize,
}: {
  node: CanvasNode;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPointerDown: (ev: ReactPointerEvent) => void;
  onPortClick: (port: PortId) => void;
  onSize: (size: { w: number; h: number }) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      onSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    onSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, [onSize]);

  const rows =
    node.type === "priority"
      ? node.data.priorities
      : node.type === "route"
        ? ["1 - Prioridade", "2 - Prioridade", "3 - Prioridade"]
        : [];

  return (
    <div
      ref={ref}
      className={cn(
        "group absolute rounded-2xl bg-white shadow-md border border-black/10",
        selected ? "ring-2 ring-emerald-400" : ""
      )}
      style={{ left: node.x, top: node.y }}
      onPointerDown={(ev) => {
        onSelect();
        onPointerDown(ev);
      }}
      role="button"
      tabIndex={0}
    >
      {/* entrada */}
      <button
        type="button"
        aria-label="Conectar entrada"
        onClick={(e) => {
          e.stopPropagation();
          onPortClick("in");
        }}
        className={cn(
          "absolute -left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-emerald-500 border border-white shadow",
          selected ? "" : "opacity-80"
        )}
      />

      {/* saída */}
      <button
        type="button"
        aria-label="Conectar saída"
        onClick={(e) => {
          e.stopPropagation();
          onPortClick("out");
        }}
        className={cn(
          "absolute -right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-emerald-500 border border-white shadow",
          selected ? "" : "opacity-80"
        )}
      />

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-xl bg-black flex items-center justify-center text-white">
            {iconForType(node.type)}
          </span>
          <span className="text-emerald-700 font-semibold">{labelForType(node.type)}</span>
        </div>
        <button
          type="button"
          className="h-8 w-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          aria-label="Excluir"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Excluir este card?")) onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 text-emerald-700" />
        </button>
      </div>

      {(node.type === "priority" || node.type === "route") && (
        <div className="px-4 pb-4 space-y-2">
          {(rows.length > 0 ? rows : ["1 - Prioridade", "2 - Prioridade", "3 - Prioridade"]).map((_label, idx) => (
            <div key={idx} className="h-7 rounded-lg bg-zinc-100" />
          ))}
        </div>
      )}

      {node.type === "text" && (
        <div className="px-4 pb-4">
          <div className="h-16 rounded-lg bg-zinc-100" />
        </div>
      )}
    </div>
  );
}
