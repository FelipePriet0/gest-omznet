"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanvasEdge, CanvasMode, CanvasNode, CanvasViewport, PortId } from "../types";
import { NodeCard } from "./NodeCard";

type DragState =
  | { kind: "none" }
  | { kind: "pan"; startX: number; startY: number; startViewport: CanvasViewport }
  | { kind: "node"; nodeId: string; startX: number; startY: number; startPos: { x: number; y: number } };

type ConnectingState =
  | { kind: "none" }
  | { kind: "from"; nodeId: string; mouse: { x: number; y: number } }
  | { kind: "detach"; edgeId: string; fromNodeId: string; mouse: { x: number; y: number } };

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
  onCreateEdge,
  onUpdateEdgeTo,
  onDeleteEdge,
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
  onCreateEdge: (edge: { fromNodeId: string; toNodeId: string }) => void;
  onUpdateEdgeTo: (edge: { edgeId: string; toNodeId: string }) => void;
  onDeleteEdge: (edgeId: string) => void;
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
    if (connecting.kind === "from" || connecting.kind === "detach") {
      const canvasPoint = clientToCanvas(ev.clientX, ev.clientY);
      setConnecting((prev) => {
        if (prev.kind === "from") return { ...prev, mouse: canvasPoint };
        if (prev.kind === "detach") return { ...prev, mouse: canvasPoint };
        return prev;
      });
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

  const findClosestInPort = useCallback(
    (point: { x: number; y: number }, opts?: { excludeNodeId?: string }) => {
      let closest: { nodeId: string; dist: number } | null = null;
      const maxDist = 22;

      for (const n of nodes) {
        if (opts?.excludeNodeId && n.id === opts.excludeNodeId) continue;
        const p = portPosition(n.id, "in");
        const dx = p.x - point.x;
        const dy = p.y - point.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) continue;
        if (!closest || dist < closest.dist) closest = { nodeId: n.id, dist };
      }
      return closest;
    },
    [nodes, portPosition]
  );

  const onPointerUp = (ev: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (drag.kind !== "none") {
      dragRef.current = { kind: "none" };
      onCommit();
    }

    if (connecting.kind === "from") {
      const dropPoint = clientToCanvas(ev.clientX, ev.clientY);
      const target = findClosestInPort(dropPoint, { excludeNodeId: connecting.nodeId });
      if (target) {
        onCreateEdge({ fromNodeId: connecting.nodeId, toNodeId: target.nodeId });
        onCommit();
      }
      setConnecting({ kind: "none" });
      return;
    }

    if (connecting.kind === "detach") {
      const dropPoint = clientToCanvas(ev.clientX, ev.clientY);
      const target = findClosestInPort(dropPoint);
      if (target && target.nodeId !== connecting.fromNodeId) {
        onUpdateEdgeTo({ edgeId: connecting.edgeId, toNodeId: target.nodeId });
        onCommit();
      } else {
        onDeleteEdge(connecting.edgeId);
        onCommit();
      }
      setConnecting({ kind: "none" });
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

  const findLastEdgeForPort = useCallback(
    (nodeId: string, port: PortId) => {
      if (port === "in") {
        for (let i = edges.length - 1; i >= 0; i--) {
          const e = edges[i];
          if (e.to.nodeId === nodeId) return e;
        }
      }

      if (port === "out") {
        for (let i = edges.length - 1; i >= 0; i--) {
          const e = edges[i];
          if (e.from.nodeId === nodeId) return e;
        }
      }
      return null;
    },
    [edges]
  );

  const handlePortPointerDown = (nodeId: string, port: PortId, ev: ReactPointerEvent) => {
    if (mode !== "cursor") return;
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    wrapRef.current?.setPointerCapture(ev.pointerId);

    const canvasPoint = clientToCanvas(ev.clientX, ev.clientY);

    if (port === "out") {
      setConnecting({ kind: "from", nodeId, mouse: canvasPoint });
      return;
    }

    const edge = findLastEdgeForPort(nodeId, "in");
    if (!edge) return;
    setConnecting({ kind: "detach", edgeId: edge.id, fromNodeId: edge.from.nodeId, mouse: canvasPoint });
  };

  const edgePaths = useMemo(() => {
    return edges.map((e) => {
      const a = portPosition(e.from.nodeId, "out");
      const b = portPosition(e.to.nodeId, "in");
      return { id: e.id, d: bezierPath(a, b) };
    });
  }, [edges, portPosition]);

  const connectingPath = useMemo(() => {
    if (connecting.kind === "from") {
      const a = portPosition(connecting.nodeId, "out");
      const b = connecting.mouse;
      return bezierPath(a, b);
    }

    if (connecting.kind === "detach") {
      const a = portPosition(connecting.fromNodeId, "out");
      const b = connecting.mouse;
      return bezierPath(a, b);
    }

    return null;
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
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
          </defs>
          {edgePaths.map((p) => (
            <path key={p.id} d={p.d} fill="none" stroke="#10b981" strokeWidth={3} opacity={0.9} markerEnd="url(#arrow)" />
          ))}
          {connectingPath && (
            <path
              d={connectingPath}
              fill="none"
              stroke="#10b981"
              strokeWidth={2}
              opacity={0.6}
              strokeDasharray="6 6"
              markerEnd="url(#arrow)"
            />
          )}
        </svg>

        {nodes.map((n) => (
          <NodeCard
            key={n.id}
            node={n}
            selected={selectedNodeId === n.id}
            onSelect={() => onSelectNode(n.id)}
            onPointerDown={onNodePointerDown(n.id)}
            onPortPointerDown={(port, ev) => handlePortPointerDown(n.id, port, ev)}
            onPortPointerEnter={() => {}}
            onPortPointerLeave={() => {}}
            onSize={(size) => setSizes((prev) => ({ ...prev, [n.id]: size }))}
          />
        ))}
      </div>
    </div>
  );
}
