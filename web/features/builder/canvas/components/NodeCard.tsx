"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { UserRoundCog, BadgeAlert, MapPinned, CirclePlay, CircleStop } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasNode, PortId } from "../types";
import { listTechnicians } from "@/features/builder/services";

function iconForType(type: CanvasNode["type"]) {
  if (type === "technician") return <UserRoundCog className="h-4 w-4" />;
  if (type === "priority") return <BadgeAlert className="h-4 w-4" />;
  if (type === "start") return <CirclePlay className="h-4 w-4" />;
  if (type === "finish") return <CircleStop className="h-4 w-4" />;
  return <MapPinned className="h-4 w-4" />;
}

function labelForType(type: CanvasNode["type"]) {
  if (type === "technician") return "Técnico";
  if (type === "priority") return "Prioridade";
  if (type === "start") return "Início";
  if (type === "finish") return "Fim";
  return "Rota";
}

export function NodeCard({
  node,
  selected,
  showLeftPort,
  showRightPort,
  routeRank,
  onSelect,
  onPointerDown,
  onPortPointerDown,
  onPortPointerEnter,
  onPortPointerLeave,
  onSize,
}: {
  node: CanvasNode;
  selected: boolean;
  showLeftPort?: boolean;
  showRightPort?: boolean;
  routeRank?: number | null;
  onSelect: () => void;
  onPointerDown: (ev: ReactPointerEvent) => void;
  onPortPointerDown: (port: PortId, ev: ReactPointerEvent) => void;
  onPortPointerEnter: (port: PortId) => void;
  onPortPointerLeave: (port: PortId) => void;
  onSize: (size: { w: number; h: number }) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [techNameById, setTechNameById] = useState<Record<string, string>>({});

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
  }, []);

  // Load technician names once (for chips on technician node)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listTechnicians().catch(() => []);
        if (!active) return;
        const map: Record<string, string> = {};
        for (const t of list) map[t.id] = t.name || "Técnico";
        setTechNameById(map);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  const priorityItems = node.type === "priority"
    ? (node.data.priorities || []).filter((v) => (v || '').toString().trim().length > 0)
    : [];
  const routeItems = node.type === "route" ? (node.data.routes || []) : [];
  const technicianItems = node.type === "technician" ? (node.data.technicianIds || []) : [];
  const technicianLabels = useMemo(() => {
    if (node.type !== 'technician') return [] as string[];
    return (node.data.technicianIds || []).map((id) => techNameById[id] || id);
  }, [node.type, node.data, techNameById]);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute rounded-2xl bg-white shadow-md border border-black/10",
        selected ? "ring-2 ring-[var(--verde-primario)]" : ""
      )}
      style={{ left: node.x, top: node.y }}
      onPointerDown={(ev) => {
        onSelect();
        onPointerDown(ev);
      }}
      role="button"
      tabIndex={0}
    >
      {/* entrada — oculta para Start (sem entrada) */}
      {node.type !== "start" && (
        <button
          type="button"
          aria-label="Conectar (lado esquerdo)"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPortPointerDown("left", e);
          }}
          onPointerEnter={() => onPortPointerEnter("left")}
          onPointerLeave={() => onPortPointerLeave("left")}
          className={cn(
            "absolute -left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-[var(--verde-primario)] border border-white shadow",
            showLeftPort ? (selected ? "" : "opacity-80") : "pointer-events-none opacity-0"
          )}
        />
      )}

      {/* saída — oculta para Finish (sem saída) */}
      {node.type !== "finish" && (
        <button
          type="button"
          aria-label="Conectar (lado direito)"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPortPointerDown("right", e);
          }}
          onPointerEnter={() => onPortPointerEnter("right")}
          onPointerLeave={() => onPortPointerLeave("right")}
          className={cn(
            "absolute -right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-[var(--verde-primario)] border border-white shadow",
            showRightPort ? (selected ? "" : "opacity-80") : "pointer-events-none opacity-0"
          )}
        />
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-[6px] bg-black flex items-center justify-center text-white">
            {iconForType(node.type)}
          </span>
          <span className="text-[var(--verde-primario)] font-semibold">{labelForType(node.type)}</span>
        </div>
        {node.type === 'route' && typeof routeRank === 'number' && routeRank > 0 && (
          <span
            title={`Quadro de Bairros ${routeRank}`}
            className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
          >
            Bairros {routeRank}
          </span>
        )}
      </div>

      {node.type === "priority" && (
        <div className="px-4 pb-4">
          {priorityItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {priorityItems.slice(0, 6).map((label, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-[6px] border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-800"
                >
                  {label}
                </span>
              ))}
              {priorityItems.length > 6 && (
                <span className="text-[11px] text-zinc-500">+{priorityItems.length - 6}</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">Sem prioridades</div>
          )}
        </div>
      )}

      {node.type === "route" && (
        <div className="px-4 pb-4">
          {routeItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {routeItems.slice(0, 6).map((route) => (
                <span
                  key={route}
                  className="inline-flex items-center rounded-[6px] border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-800"
                >
                  {route}
                </span>
              ))}
              {routeItems.length > 6 && (
                <span className="text-[11px] text-zinc-500">+{routeItems.length - 6}</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">Nenhuma rota selecionada</div>
          )}
        </div>
      )}

      {node.type === "technician" && (
        <div className="px-4 pb-4">
          {technicianItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {technicianLabels.slice(0, 6).map((label, idx) => (
                <span
                  key={`${label}-${idx}`}
                  className="inline-flex items-center rounded-[6px] border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-800"
                >
                  {label}
                </span>
              ))}
              {technicianLabels.length > 6 && (
                <span className="text-[11px] text-zinc-500">+{technicianLabels.length - 6}</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">Nenhum técnico selecionado</div>
          )}
        </div>
      )}

    </div>
  );
}
