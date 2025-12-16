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
  | { kind: "create"; from: { nodeId: string; port: PortId }; mouse: { x: number; y: number } }
  | {
      kind: "detach";
      edgeId: string;
      fixed: { nodeId: string; port: PortId };
      draggingEnd: "from" | "to";
      mouse: { x: number; y: number };
    };

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
  onUpdateEdgeEnd,
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
  onCreateEdge: (edge: { from: { nodeId: string; port: PortId }; to: { nodeId: string; port: PortId } }) => void;
  onUpdateEdgeEnd: (edge: { edgeId: string; end: "from" | "to"; nodeId: string; port: PortId }) => void;
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
      const x = port === "left" ? node.x : node.x + size.w;
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
    if (connecting.kind === "create" || connecting.kind === "detach") {
      const canvasPoint = clientToCanvas(ev.clientX, ev.clientY);
      setConnecting((prev) => {
        if (prev.kind === "create") return { ...prev, mouse: canvasPoint };
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

  const findClosestPort = useCallback(
    (point: { x: number; y: number }, opts?: { excludeNodeId?: string }) => {
      let closest: { nodeId: string; port: PortId; dist: number } | null = null;
      const maxDist = 22;

      for (const n of nodes) {
        if (opts?.excludeNodeId && n.id === opts.excludeNodeId) continue;
        const candidates: PortId[] = ["left", "right"];
        for (const port of candidates) {
          const p = portPosition(n.id, port);
          const dx = p.x - point.x;
          const dy = p.y - point.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > maxDist) continue;
          if (!closest || dist < closest.dist) closest = { nodeId: n.id, port, dist };
        }
      }
      if (!closest) return null;
      return { nodeId: closest.nodeId, port: closest.port };
    },
    [nodes, portPosition]
  );

  const onPointerUp = (ev: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (drag.kind !== "none") {
      dragRef.current = { kind: "none" };
      onCommit();
    }

    if (connecting.kind === "create") {
      const dropPoint = clientToCanvas(ev.clientX, ev.clientY);
      const target = findClosestPort(dropPoint, { excludeNodeId: connecting.from.nodeId });
      if (target) {
        onCreateEdge({ from: connecting.from, to: target });
        onCommit();
      }
      setConnecting({ kind: "none" });
      return;
    }

    if (connecting.kind === "detach") {
      const dropPoint = clientToCanvas(ev.clientX, ev.clientY);
      const target = findClosestPort(dropPoint, { excludeNodeId: connecting.fixed.nodeId });
      if (target && target.nodeId !== connecting.fixed.nodeId) {
        onUpdateEdgeEnd({ edgeId: connecting.edgeId, end: connecting.draggingEnd, nodeId: target.nodeId, port: target.port });
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

  const handlePortPointerDown = (nodeId: string, port: PortId, ev: ReactPointerEvent) => {
    if (mode !== "cursor") return;
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    wrapRef.current?.setPointerCapture(ev.pointerId);

    const canvasPoint = clientToCanvas(ev.clientX, ev.clientY);

    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i];
      if (edge.from.nodeId === nodeId && edge.from.port === port) {
        setConnecting({
          kind: "detach",
          edgeId: edge.id,
          fixed: edge.to,
          draggingEnd: "from",
          mouse: canvasPoint,
        });
        return;
      }

      if (edge.to.nodeId === nodeId && edge.to.port === port) {
        setConnecting({
          kind: "detach",
          edgeId: edge.id,
          fixed: edge.from,
          draggingEnd: "to",
          mouse: canvasPoint,
        });
        return;
      }
    }

    setConnecting({ kind: "create", from: { nodeId, port }, mouse: canvasPoint });
  };

  const edgePaths = useMemo(() => {
    const visibleEdges = connecting.kind === "detach" ? edges.filter((e) => e.id !== connecting.edgeId) : edges;

    return visibleEdges.map((e) => {
      const a = portPosition(e.from.nodeId, e.from.port);
      const b = portPosition(e.to.nodeId, e.to.port);
      return { id: e.id, d: bezierPath(a, b) };
    });
  }, [connecting, edges, portPosition]);

  const connectingPath = useMemo(() => {
    if (connecting.kind === "create") {
      const a = portPosition(connecting.from.nodeId, connecting.from.port);
      const b = connecting.mouse;
      return bezierPath(a, b);
    }

    if (connecting.kind === "detach") {
      const a = portPosition(connecting.fixed.nodeId, connecting.fixed.port);
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
          {edgePaths.map((p) => (
            <path key={p.id} d={p.d} fill="none" stroke="var(--verde-primario)" strokeWidth={3} opacity={0.9} />
          ))}
          {connectingPath && (
            <path
              d={connectingPath}
              fill="none"
              stroke="var(--verde-primario)"
              strokeWidth={2}
              opacity={0.6}
              strokeDasharray="6 6"
            />
          )}
        </svg>

        {nodes.map((n) => {
          const hasLeft = edges.some(
            (e) => (e.from.nodeId === n.id && e.from.port === "left") || (e.to.nodeId === n.id && e.to.port === "left")
          );
          const hasRight = edges.some(
            (e) => (e.from.nodeId === n.id && e.from.port === "right") || (e.to.nodeId === n.id && e.to.port === "right")
          );
          const isSelected = selectedNodeId === n.id;

          return (
            <NodeCard
              key={n.id}
              node={n}
              selected={isSelected}
              showLeftPort={isSelected || hasLeft}
              showRightPort={isSelected || hasRight}
              onSelect={() => onSelectNode(n.id)}
              onPointerDown={onNodePointerDown(n.id)}
              onPortPointerDown={(port, ev) => handlePortPointerDown(n.id, port, ev)}
              onPortPointerEnter={() => {}}
              onPortPointerLeave={() => {}}
              onSize={(size) => setSizes((prev) => ({ ...prev, [n.id]: size }))}
            />
          );
        })}
      </div>
    </div>
  );
}
