"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanvasEdge, CanvasMode, CanvasNode, CanvasViewport, PortId } from "../types";
import { NodeCard } from "./NodeCard";

type DragState =
  | { kind: "none" }
  | { kind: "pan"; startX: number; startY: number; startViewport: CanvasViewport }
  | { kind: "node"; nodeId: string; startX: number; startY: number; startPos: { x: number; y: number } };

type ConnectingState =
  | { kind: "none" }
  | { kind: "from"; nodeId: string; mouse: { x: number; y: number } };

function bezierPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = Math.max(80, Math.abs(b.x - a.x) * 0.35);
  const c1 = { x: a.x + dx, y: a.y };
  const c2 = { x: b.x - dx, y: b.y };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
}

export function CanvasSurface({
  mode,
  viewport,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onChangeViewport,
  onMoveNode,
  onDeleteNode,
  onCreateEdge,
  onCommit,
}: {
  mode: CanvasMode;
  viewport: CanvasViewport;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onChangeViewport: (next: CanvasViewport) => void;
  onMoveNode: (id: string, pos: { x: number; y: number }) => void;
  onDeleteNode: (id: string) => void;
  onCreateEdge: (edge: { fromNodeId: string; toNodeId: string }) => void;
  onCommit: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({ kind: "none" });
  const [connecting, setConnecting] = useState<ConnectingState>({ kind: "none" });
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});

  const nodeById = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const portPosition = useCallback(
    (nodeId: string, port: PortId) => {
      const node = nodeById.get(nodeId);
      if (!node) return { x: 0, y: 0 };
      const size = sizes[nodeId] ?? { w: 220, h: 64 };
      const x = port === "in" ? node.x : node.x + size.w;
      const y = node.y + size.h / 2;
      return { x, y };
    },
    [nodeById, sizes]
  );

  const onBackgroundPointerDown = (ev: ReactPointerEvent) => {
    if (mode !== "hand") {
      onSelectNode(null);
      if (connecting.kind !== "none") setConnecting({ kind: "none" });
      return;
    }
    if (ev.button !== 0) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    dragRef.current = { kind: "pan", startX: ev.clientX, startY: ev.clientY, startViewport: viewport };
  };

  const onNodePointerDown = (nodeId: string) => (ev: ReactPointerEvent) => {
    if (mode !== "cursor") return;
    if (ev.button !== 0) return;
    ev.stopPropagation();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    const node = nodeById.get(nodeId);
    if (!node) return;
    dragRef.current = {
      kind: "node",
      nodeId,
      startX: ev.clientX,
      startY: ev.clientY,
      startPos: { x: node.x, y: node.y },
    };
  };

  const onPointerMove = (ev: ReactPointerEvent) => {
    if (connecting.kind === "from") {
      const canvasPoint = clientToCanvas(ev.clientX, ev.clientY);
      setConnecting({ kind: "from", nodeId: connecting.nodeId, mouse: canvasPoint });
    }

    const drag = dragRef.current;
    if (drag.kind === "pan") {
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      onChangeViewport({ x: drag.startViewport.x + dx, y: drag.startViewport.y + dy });
      return;
    }

    if (drag.kind === "node") {
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      onMoveNode(drag.nodeId, { x: drag.startPos.x + dx, y: drag.startPos.y + dy });
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (drag.kind !== "none") {
      dragRef.current = { kind: "none" };
      onCommit();
    }
  };

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left - viewport.x;
      const y = clientY - rect.top - viewport.y;
      return { x, y };
    },
    [viewport.x, viewport.y]
  );

  const handlePortClick = (nodeId: string, port: PortId) => {
    if (mode !== "cursor") return;

    if (port === "out") {
      setConnecting((prev) => {
        if (prev.kind === "from" && prev.nodeId === nodeId) return { kind: "none" };
        return { kind: "from", nodeId, mouse: { x: 0, y: 0 } };
      });
      return;
    }

    if (port === "in") {
      if (connecting.kind !== "from") return;
      if (connecting.nodeId === nodeId) return;
      onCreateEdge({ fromNodeId: connecting.nodeId, toNodeId: nodeId });
      setConnecting({ kind: "none" });
      onCommit();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!selectedNodeId) return;
      if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
      if (!window.confirm("Excluir este card?")) return;
      onDeleteNode(selectedNodeId);
      onCommit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeId, onDeleteNode, onCommit]);

  const edgePaths = useMemo(() => {
    return edges.map((e) => {
      const a = portPosition(e.from.nodeId, "out");
      const b = portPosition(e.to.nodeId, "in");
      return { id: e.id, d: bezierPath(a, b) };
    });
  }, [edges, portPosition]);

  const connectingPath = useMemo(() => {
    if (connecting.kind !== "from") return null;
    const a = portPosition(connecting.nodeId, "out");
    const b = connecting.mouse;
    return bezierPath(a, b);
  }, [connecting, portPosition]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={onBackgroundPointerDown}
      role="application"
      aria-label="Canvas"
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0)`,
        }}
      >
        <svg className="absolute inset-0 overflow-visible" aria-hidden="true">
          {edgePaths.map((p) => (
            <path key={p.id} d={p.d} fill="none" stroke="#10b981" strokeWidth={3} opacity={0.9} />
          ))}
          {connectingPath && <path d={connectingPath} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.6} strokeDasharray="6 6" />}
        </svg>

        {nodes.map((n) => (
          <NodeCard
            key={n.id}
            node={n}
            selected={selectedNodeId === n.id}
            onSelect={() => onSelectNode(n.id)}
            onDelete={() => {
              onDeleteNode(n.id);
              onCommit();
            }}
            onPointerDown={onNodePointerDown(n.id)}
            onPortClick={(port) => handlePortClick(n.id, port)}
            onSize={(size) => setSizes((prev) => ({ ...prev, [n.id]: size }))}
          />
        ))}
      </div>
    </div>
  );
}
