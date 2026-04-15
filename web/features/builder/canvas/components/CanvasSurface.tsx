"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanvasEdge, CanvasMode, CanvasNode, CanvasViewport, PortId } from "../types";
import { NodeCard } from "./NodeCard";

type DragState =
  | { kind: "none" }
  | { kind: "pan"; startX: number; startY: number; startViewport: CanvasViewport }
  | { kind: "node"; startX: number; startY: number; startPositions: Record<string, { x: number; y: number }> }
  | { kind: "lasso"; startX: number; startY: number };

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

type LassoRect = { x1: number; y1: number; x2: number; y2: number };

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
  selectedNodeIds,
  onSelectNodes,
  onChangeViewport,
  onMoveNodes,
  onCreateEdge,
  onUpdateEdgeEnd,
  onDeleteEdge,
  onCommit,
}: {
  mode: CanvasMode;
  viewport: CanvasViewport;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeIds: string[];
  onSelectNodes: (ids: string[]) => void;
  onChangeViewport: (next: CanvasViewport) => void;
  onMoveNodes: (positions: Record<string, { x: number; y: number }>) => void;
  onCreateEdge: (edge: { from: { nodeId: string; port: PortId }; to: { nodeId: string; port: PortId } }) => void;
  onUpdateEdgeEnd: (edge: { edgeId: string; end: "from" | "to"; nodeId: string; port: PortId }) => void;
  onDeleteEdge: (edgeId: string) => void;
  onCommit: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({ kind: "none" });
  const [connecting, setConnecting] = useState<ConnectingState>({ kind: "none" });
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [lasso, setLasso] = useState<LassoRect | null>(null);

  // Keep latest viewport/callback in refs so wheel handler (attached once) always has fresh values
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const onChangeViewportRef = useRef(onChangeViewport);
  onChangeViewportRef.current = onChangeViewport;

  const updateSize = useCallback((id: string, size: { w: number; h: number }) => {
    setSizes((prev) => {
      const curr = prev[id];
      if (curr && curr.w === size.w && curr.h === size.h) return prev;
      return { ...prev, [id]: size };
    });
  }, []);

  const nodeById = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  const zoom = viewport.zoom ?? 1;

  // Native wheel listener (passive:false required to call preventDefault)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const handleWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = el.getBoundingClientRect();
      const vp = viewportRef.current;
      const currentZoom = vp.zoom ?? 1;
      const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(5, Math.max(0.2, currentZoom * factor));

      // Zoom centrado no cursor
      const canvasX = (ev.clientX - rect.left - vp.x) / currentZoom;
      const canvasY = (ev.clientY - rect.top - vp.y) / currentZoom;
      const newX = ev.clientX - rect.left - canvasX * newZoom;
      const newY = ev.clientY - rect.top - canvasY * newZoom;

      onChangeViewportRef.current({ x: newX, y: newY, zoom: newZoom });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left - viewport.x) / zoom;
      const y = (clientY - rect.top - viewport.y) / zoom;
      return { x, y };
    },
    [viewport.x, viewport.y, zoom]
  );

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
    if (mode === "hand") {
      if (ev.button !== 0) return;
      ev.currentTarget.setPointerCapture(ev.pointerId);
      dragRef.current = { kind: "pan", startX: ev.clientX, startY: ev.clientY, startViewport: viewport };
      return;
    }

    // cursor mode
    if (ev.button !== 0) return;
    if (connecting.kind !== "none") {
      setConnecting({ kind: "none" });
      return;
    }
    ev.currentTarget.setPointerCapture(ev.pointerId);
    dragRef.current = { kind: "lasso", startX: ev.clientX, startY: ev.clientY };
  };

  const onNodePointerDown = (nodeId: string) => (ev: ReactPointerEvent) => {
    if (mode !== "cursor") return;
    if (ev.button !== 0) return;
    ev.stopPropagation();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);

    const idsToMove = selectedSet.has(nodeId) ? [...selectedSet] : [nodeId];

    if (!selectedSet.has(nodeId)) {
      onSelectNodes([nodeId]);
    }

    const startPositions: Record<string, { x: number; y: number }> = {};
    for (const id of idsToMove) {
      const n = nodeById.get(id);
      if (n) startPositions[id] = { x: n.x, y: n.y };
    }

    dragRef.current = { kind: "node", startX: ev.clientX, startY: ev.clientY, startPositions };
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
      onChangeViewport({ x: drag.startViewport.x + dx, y: drag.startViewport.y + dy, zoom: drag.startViewport.zoom ?? 1 });
      return;
    }

    if (drag.kind === "lasso") {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setLasso({
        x1: Math.min(drag.startX, ev.clientX) - rect.left,
        y1: Math.min(drag.startY, ev.clientY) - rect.top,
        x2: Math.max(drag.startX, ev.clientX) - rect.left,
        y2: Math.max(drag.startY, ev.clientY) - rect.top,
      });
      return;
    }

    if (drag.kind === "node") {
      const dxCanvas = (ev.clientX - drag.startX) / zoom;
      const dyCanvas = (ev.clientY - drag.startY) / zoom;
      const positions: Record<string, { x: number; y: number }> = {};
      for (const [id, start] of Object.entries(drag.startPositions)) {
        positions[id] = { x: start.x + dxCanvas, y: start.y + dyCanvas };
      }
      onMoveNodes(positions);
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

    if (drag.kind === "lasso") {
      dragRef.current = { kind: "none" };
      setLasso(null);
      const el = wrapRef.current;
      if (!el) return;
      const moved = Math.abs(ev.clientX - drag.startX) > 4 || Math.abs(ev.clientY - drag.startY) > 4;
      if (moved) {
        const rect = el.getBoundingClientRect();
        const x1 = (Math.min(drag.startX, ev.clientX) - rect.left - viewport.x) / zoom;
        const y1 = (Math.min(drag.startY, ev.clientY) - rect.top - viewport.y) / zoom;
        const x2 = (Math.max(drag.startX, ev.clientX) - rect.left - viewport.x) / zoom;
        const y2 = (Math.max(drag.startY, ev.clientY) - rect.top - viewport.y) / zoom;
        const inLasso = nodes.filter((n) => {
          const size = sizes[n.id] ?? { w: 220, h: 64 };
          return n.x < x2 && n.x + size.w > x1 && n.y < y2 && n.y + size.h > y1;
        });
        onSelectNodes(inLasso.map((n) => n.id));
      } else {
        onSelectNodes([]);
      }
      return;
    }

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

  const handlePortPointerDown = (nodeId: string, port: PortId, ev: ReactPointerEvent) => {
    if (mode !== "cursor") return;
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    wrapRef.current?.setPointerCapture(ev.pointerId);

    const canvasPoint = clientToCanvas(ev.clientX, ev.clientY);

    if (port === "right") {
      setConnecting({ kind: "create", from: { nodeId, port }, mouse: canvasPoint });
      return;
    }

    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i];
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

  const routeRankMap = useMemo(() => {
    const map = new Map<string, number>();
    let rank = 0;
    for (const n of nodes) {
      if (n.type === "route") {
        rank += 1;
        map.set(n.id, rank);
      }
    }
    return map;
  }, [nodes]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={onBackgroundPointerDown}
      role="application"
      aria-label="Canvas"
      style={{ touchAction: "none" }}
    >
      {/* Canvas world — transformed by pan + zoom */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <svg className="absolute inset-0 overflow-visible" aria-hidden="true">
          <defs>
            <marker
              id="mz-arrow-end"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--verde-primario)" />
            </marker>
          </defs>
          {edgePaths.map((p) => (
            <path key={p.id} d={p.d} fill="none" stroke="var(--verde-primario)" strokeWidth={3} opacity={0.9} markerEnd="url(#mz-arrow-end)" />
          ))}
          {connectingPath && (
            <path
              d={connectingPath}
              fill="none"
              stroke="var(--verde-primario)"
              strokeWidth={2}
              opacity={0.6}
              strokeDasharray="6 6"
              markerEnd="url(#mz-arrow-end)"
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
          const isSelected = selectedSet.has(n.id);

          return (
            <NodeCard
              key={n.id}
              node={n}
              selected={isSelected}
              showLeftPort={isSelected || hasLeft}
              showRightPort={isSelected || hasRight}
              routeRank={n.type === "route" ? (routeRankMap.get(n.id) || null) : null}
              onSelect={() => onSelectNodes([n.id])}
              onPointerDown={onNodePointerDown(n.id)}
              onPortPointerDown={(port, ev) => handlePortPointerDown(n.id, port, ev)}
              onPortPointerEnter={() => {}}
              onPortPointerLeave={() => {}}
              onSize={(size) => updateSize(n.id, size)}
            />
          );
        })}
      </div>

      {/* Lasso selection rectangle — in screen space, outside the scaled world */}
      {lasso && (
        <div
          className="absolute pointer-events-none rounded-sm border border-emerald-500 bg-emerald-500/10"
          style={{
            left: lasso.x1,
            top: lasso.y1,
            width: lasso.x2 - lasso.x1,
            height: lasso.y2 - lasso.y1,
          }}
        />
      )}
    </div>
  );
}
