"use client";

import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { useHistory } from "./useHistory";
import type { CanvasEdge, CanvasNode, CanvasNodeType, CanvasWorkflowState } from "./types";
import { CanvasDock } from "./components/CanvasDock";
import { CanvasSurface } from "./components/CanvasSurface";
import { Inspector } from "./components/Inspector";
import { LeftPalette } from "./components/LeftPalette";

function uid(prefix: string) {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${base}`;
}

function estimatedNodeSize(type: CanvasNodeType) {
  if (type === "priority") return { w: 260, h: 190 };
  if (type === "text") return { w: 260, h: 160 };
  return { w: 260, h: 130 };
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findFreeSpot({
  nodes,
  viewport,
  type,
}: {
  nodes: CanvasNode[];
  viewport: CanvasWorkflowState["viewport"];
  type: CanvasNodeType;
}) {
  const { w, h } = estimatedNodeSize(type);
  const padding = 24;

  const taken = nodes.map((n) => {
    const size = estimatedNodeSize(n.type);
    return { x: n.x, y: n.y, w: size.w + padding, h: size.h + padding };
  });

  const baseX = 300 - viewport.x;
  const baseY = 160 - viewport.y;
  const stepX = 320;
  const stepY = 220;

  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 6; col++) {
      const candidate = { x: baseX + col * stepX, y: baseY + row * stepY, w, h };
      const collides = taken.some((r) => rectsOverlap(candidate, r));
      if (!collides) return { x: candidate.x, y: candidate.y };
    }
  }

  return { x: baseX, y: baseY };
}

function initialState(): CanvasWorkflowState {
  const nodes: CanvasNode[] = [
    { id: "n_technician", type: "technician", x: 420, y: 220, data: { technicianIds: [] } },
    { id: "n_priority", type: "priority", x: 650, y: 200, data: { priorities: ["", "", ""] } },
    { id: "n_route", type: "route", x: 890, y: 235, data: { routes: [] } },
  ];

  const edges: CanvasEdge[] = [
    { id: "e_1", from: { nodeId: "n_technician", port: "out" }, to: { nodeId: "n_priority", port: "in" } },
    { id: "e_2", from: { nodeId: "n_priority", port: "out" }, to: { nodeId: "n_route", port: "in" } },
  ];

  return {
    mode: "cursor",
    viewport: { x: 0, y: 0 },
    nodes,
    edges,
    selectedNodeId: null,
  };
}

export function CanvasPage() {
  const history = useHistory<CanvasWorkflowState>(useMemo(() => initialState(), []), { max: 80 });
  const state = history.present;

  const selectedNode = state.selectedNodeId ? state.nodes.find((n) => n.id === state.selectedNodeId) ?? null : null;

  const createNode = (type: CanvasNodeType) => {
    history.commit((prev) => {
      const id = uid("node");
      const pos = findFreeSpot({ nodes: prev.nodes, viewport: prev.viewport, type });
      const x = pos.x;
      const y = pos.y;

      const node: CanvasNode =
        type === "technician"
          ? { id, type, x, y, data: { technicianIds: [] } }
          : type === "priority"
            ? { id, type, x, y, data: { priorities: ["", "", ""] } }
            : type === "route"
              ? { id, type, x, y, data: { routes: [] } }
              : { id, type: "text", x, y, data: { text: "" } };

      return { ...prev, nodes: [...prev.nodes, node], selectedNodeId: id };
    });
  };

  const createEdge = ({ fromNodeId, toNodeId }: { fromNodeId: string; toNodeId: string }) => {
    history.setPresent((prev) => {
      const exists = prev.edges.some((e) => e.from.nodeId === fromNodeId && e.to.nodeId === toNodeId);
      if (exists) return prev;
      const edge: CanvasEdge = {
        id: uid("edge"),
        from: { nodeId: fromNodeId, port: "out" },
        to: { nodeId: toNodeId, port: "in" },
      };
      return { ...prev, edges: [...prev.edges, edge] };
    });
  };

  return (
    <div
      className="relative flex-1 w-full h-full rounded-3xl overflow-hidden"
      style={{
        backgroundColor: "#bdbdbd",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: "20px 20px, 20px 20px",
        backgroundPosition: "-1px -1px",
      }}
    >
      {/* Top left: back + title */}
      <div className="pointer-events-auto absolute left-6 top-6 z-20 flex items-center gap-2">
        <button
          type="button"
          className="h-9 w-9 rounded-full bg-transparent hover:bg-black/5 flex items-center justify-center"
          aria-label="Voltar"
          onClick={() => {
            try {
              window.location.href = "/builder";
            } catch {}
          }}
        >
          <ChevronLeft className="h-5 w-5 text-emerald-700" />
        </button>
        <div className="text-lg font-semibold text-black">New Workflow</div>
      </div>

      {/* Left palette */}
      <LeftPalette onCreate={createNode} />

      {/* Canvas surface */}
      <CanvasSurface
        mode={state.mode}
        viewport={state.viewport}
        nodes={state.nodes}
        edges={state.edges}
        selectedNodeId={state.selectedNodeId}
        onSelectNode={(id) => history.setPresent((prev) => ({ ...prev, selectedNodeId: id }))}
        onChangeViewport={(v) => history.setPresent((prev) => ({ ...prev, viewport: v }))}
        onMoveNode={(id, pos) =>
          history.setPresent((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...pos } : n)),
          }))
        }
        onCreateEdge={createEdge}
        onUpdateEdgeTo={({ edgeId, toNodeId }) =>
          history.setPresent((prev) => ({
            ...prev,
            edges: prev.edges.map((e) => (e.id === edgeId ? { ...e, to: { ...e.to, nodeId: toNodeId } } : e)),
          }))
        }
        onDeleteEdge={(edgeId) => history.setPresent((prev) => ({ ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }))}
        onCommit={() => history.commit((p) => p)}
      />

      {/* Right inspector (config panel) */}
      <Inspector
        node={selectedNode}
        onChange={(next) => {
          history.commit((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) => (n.id === next.id ? next : n)),
          }));
        }}
        onDelete={() => {
          if (!state.selectedNodeId) return;
          history.commit((prev) => {
            const id = prev.selectedNodeId;
            return {
              ...prev,
              nodes: prev.nodes.filter((n) => n.id !== id),
              edges: prev.edges.filter((e) => e.from.nodeId !== id && e.to.nodeId !== id),
              selectedNodeId: null,
            };
          });
        }}
      />

      {/* Bottom dock */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <CanvasDock
          mode={state.mode}
          onChangeMode={(m) => history.setPresent((prev) => ({ ...prev, mode: m }))}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
        />
      </div>
    </div>
  );
}
