"use client";

import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasNode, CanvasNodeType } from "../types";
import { PrioritySelectPopover } from "./PrioritySelectPopover";

const TECHNICIANS = [
  { id: "leandro", name: "Leandro Arruda" },
  { id: "alessandro", name: "Alessandro" },
  { id: "rafael", name: "Rafael" },
];

const PRIORITY_OPTIONS = [
  "Bairro",
  "Casa",
  "Prédio com Prumada",
  "Prédio sem Prumada (+3 andares)",
  "Wi-Fi Extend",
];

const ROUTE_OPTIONS = [
  "Centro",
  "Santa Mônica",
  "Tibery",
  "Umuarama",
  "Martins",
  "Luizote",
];

function titleForType(type: CanvasNodeType) {
  if (type === "technician") return "Selecione os Técnicos";
  if (type === "priority") return "Defina as Prioridades";
  if (type === "route") return "Defina as Rotas";
  return "Texto";
}

function subtitleForType(type: CanvasNodeType) {
  if (type === "technician") return "Escolha o(s) técnico(s) desse workflow";
  if (type === "priority") return "Defina as prioridades desse card";
  if (type === "route") return "Defina as rotas desse card";
  return "Anotação livre (não altera a lógica)";
}

export function Inspector({
  node,
  onChange,
  onDelete,
}: {
  node: CanvasNode | null;
  onChange: (next: CanvasNode) => void;
  onDelete: () => void;
}) {
  if (!node) return null;

  return (
    <div className="pointer-events-auto absolute right-6 top-16 w-[320px] rounded-2xl bg-white shadow-lg border border-black/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-zinc-900">{titleForType(node.type)}</div>
          <div className="text-xs text-zinc-500">{subtitleForType(node.type)}</div>
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
          </div>
        )}

        {node.type === "priority" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-700">Prioridades</div>
              <button
                type="button"
                aria-label="Adicionar prioridade"
                className="h-[25px] w-[50px] rounded-[6px] bg-black text-xs font-semibold text-white hover:bg-black/90 transition"
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
            <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-auto pr-1">
              {ROUTE_OPTIONS.map((r) => {
                const checked = node.data.routes.includes(r);
                return (
                  <label
                    key={r}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked ? [...node.data.routes, r] : node.data.routes.filter((x) => x !== r);
                        onChange({ ...node, data: { ...node.data, routes: next } });
                      }}
                    />
                    <span className="text-sm text-zinc-800">{r}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {node.type === "text" && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-700">Texto</div>
            <textarea
              value={node.data.text}
              onChange={(e) => onChange({ ...node, data: { ...node.data, text: e.target.value } })}
              className="min-h-[140px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
              placeholder="Escreva uma anotação..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
