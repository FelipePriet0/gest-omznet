"use client";

import React, { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasNode, CanvasNodeType } from "../types";
import { PrioritySelectPopover } from "./PrioritySelectPopover";
import { RouteMultiSelectPopover } from "./RouteMultiSelectPopover";
import { listPriorities, listRoutes, listTechnicians } from "@/features/builder/services";

function useBuilderRefs() {
  const [technicians, setTechnicians] = React.useState<{ id: string; name: string }[]>([]);
  const [priorities, setPriorities] = React.useState<string[]>([]);
  const [routes, setRoutes] = React.useState<string[]>([]);
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [t, p, r] = await Promise.all([
          listTechnicians().catch(() => []),
          listPriorities().catch(() => []),
          listRoutes().catch(() => []),
        ]);
        if (!active) return;
        setTechnicians(t);
        setPriorities(p.map((x) => x.label));
        setRoutes(r.filter((x) => x.active).map((x) => x.name));
      } catch {}
    })();
    return () => { active = false; };
  }, []);
  return { technicians, priorities, routes };
}

function titleForType(type: CanvasNodeType) {
  if (type === "technician") return "Selecione os Técnicos";
  if (type === "priority") return "Defina as Prioridades";
  return "Defina as Rotas";
}

function subtitleForType(type: CanvasNodeType) {
  if (type === "technician") return "Escolha o(s) técnico(s) desse workflow";
  if (type === "priority") return "Defina as prioridades desse card";
  return "Defina as rotas desse card";
}

export function Inspector({
  node,
  routeRank,
  nodes,
  onChange,
  onDelete,
}: {
  node: CanvasNode | null;
  routeRank?: number | null;
  nodes?: CanvasNode[];
  onChange: (next: CanvasNode) => void;
  onDelete: () => void;
}) {
  const { technicians: TECHNICIANS, priorities: PRIORITY_OPTIONS, routes: ROUTE_OPTIONS } = useBuilderRefs();
  const [techDupError, setTechDupError] = useState<string | null>(null);
  if (!node) return null;
  if (node.type === "start" || node.type === "finish") return null;

  return (
    <div className="pointer-events-auto absolute right-6 top-[99px] w-[320px] rounded-2xl border border-black/5 bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-zinc-900">{titleForType(node.type)}</div>
          <div className="text-xs text-zinc-500">{subtitleForType(node.type)}</div>
          {node.type === 'route' && typeof routeRank === 'number' && routeRank > 0 && (
            <div className="mt-1 inline-flex items-center gap-2 text-xs">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-600/10 px-2 py-0.5 font-semibold text-emerald-700">Quadro de Bairros {routeRank}</span>
              <span className="text-zinc-500">Quanto menor o número, maior a prioridade.</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="h-8 w-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center"
          aria-label="Excluir card"
          onClick={() => {
            if (window.confirm("Excluir este card?")) onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 text-emerald-700" />
        </button>
      </div>

      <div className="mt-4">
        {node.type === "technician" && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-700">Técnicos</div>
            <div className="grid grid-cols-1 gap-2">
              {TECHNICIANS.map((t) => {
                const checked = node.data.technicianIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-[6px] border px-3 py-2 transition",
                      checked
                        ? "border-[var(--verde-primario)] bg-[var(--verde-primario)] text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      className="sr-only"
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...node.data.technicianIds, t.id]
                          : node.data.technicianIds.filter((id) => id !== t.id);
                        // Verifica duplicata: outro card de técnico com exatamente os mesmos IDs
                        const sorted = [...next].sort().join(",");
                        const hasDup = (nodes || []).some(
                          (n) =>
                            n.id !== node.id &&
                            n.type === "technician" &&
                            [...(n.data.technicianIds || [])].sort().join(",") === sorted &&
                            sorted.length > 0
                        );
                        if (hasDup) {
                          setTechDupError("Já existe um card de Técnico com essa mesma seleção.");
                          return;
                        }
                        setTechDupError(null);
                        onChange({ ...node, data: { ...node.data, technicianIds: next } });
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-5 w-5 rounded-[6px] border flex items-center justify-center",
                        checked ? "border-white bg-white/15" : "border-zinc-300 bg-white group-hover:border-zinc-400"
                      )}
                    >
                      <Check className={cn("h-4 w-4", checked ? "text-white opacity-100" : "opacity-0")} />
                    </span>
                    <span className={cn("text-sm font-medium", checked ? "text-white" : "text-zinc-800")}>{t.name}</span>
                  </label>
                );
              })}
            </div>
            {techDupError && (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {techDupError}
              </p>
            )}
          </div>
        )}

        {node.type === "priority" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-700">Prioridades</div>
              <button
                type="button"
                aria-label="Adicionar prioridade"
                className="h-[25px] w-[50px] rounded-[6px] bg-[var(--verde-primario)] text-xs font-semibold text-white hover:brightness-95 transition"
                onClick={() => onChange({ ...node, data: { ...node.data, priorities: [...node.data.priorities, ""] } })}
              >
                + 1
              </button>
            </div>

            <div className="space-y-2">
              {node.data.priorities.map((value, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="text-xs font-semibold text-zinc-700">{idx + 1}º Prioridade</div>
                  <PrioritySelectPopover
                    value={value}
                    options={PRIORITY_OPTIONS}
                    placeholder="Selecionar"
                    onChange={(picked) => {
                      const next = node.data.priorities.slice();
                      next[idx] = picked;
                      onChange({ ...node, data: { ...node.data, priorities: next } });
                    }}
                    onRemove={() => {
                      const next = node.data.priorities.filter((_, i) => i !== idx);
                      onChange({ ...node, data: { ...node.data, priorities: next } });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {node.type === "route" && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-700">Rotas</div>
            <RouteMultiSelectPopover
              values={node.data.routes}
              options={ROUTE_OPTIONS}
              placeholder="Selecionar"
              onChange={(next) => onChange({ ...node, data: { ...node.data, routes: next } })}
              onClear={() => onChange({ ...node, data: { ...node.data, routes: [] } })}
            />

            {node.data.routes.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {node.data.routes.map((route) => (
                  <button
                    key={route}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-[6px] border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300"
                    onClick={() => {
                      const next = node.data.routes.filter((r) => r !== route);
                      onChange({ ...node, data: { ...node.data, routes: next } });
                    }}
                    aria-label={`Remover ${route}`}
                  >
                    <span className="truncate">{route}</span>
                    <span aria-hidden="true" className="text-zinc-500">
                      ×
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500">Nenhum bairro selecionado</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
