"use client";

import { Hand, Minus, MousePointer2, Plus, Redo2, Undo2 } from "lucide-react";
import type { CanvasMode } from "../types";

export function CanvasDock({
  mode,
  onChangeMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: {
  mode: CanvasMode;
  onChangeMode: (m: CanvasMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}) {
  const btnClass = (active?: boolean) =>
    [
      "h-9 w-9 rounded-full flex items-center justify-center transition",
      active ? "bg-emerald-100 text-emerald-700" : "text-zinc-700",
      "hover:bg-zinc-100",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
    ].join(" ");

  const zoomPct = Math.round((zoom ?? 1) * 100);

  return (
    <div
      role="toolbar"
      aria-label="Canvas toolbar"
      className="mx-auto flex items-center gap-2 rounded-2xl bg-white/90 backdrop-blur-md border border-zinc-200/50 px-3 py-2 shadow-lg"
    >
      <button
        type="button"
        title="Mão (H)"
        aria-label="Mão"
        aria-pressed={mode === "hand"}
        className={btnClass(mode === "hand")}
        onClick={() => onChangeMode("hand")}
      >
        <Hand className="h-5 w-5" />
      </button>

      <button
        type="button"
        title="Cursor (V)"
        aria-label="Cursor"
        aria-pressed={mode === "cursor"}
        className={btnClass(mode === "cursor")}
        onClick={() => onChangeMode("cursor")}
      >
        <MousePointer2 className="h-5 w-5" />
      </button>

      <div className="mx-1 h-6 w-px bg-zinc-200" />

      <button
        type="button"
        title="Desfazer"
        aria-label="Desfazer"
        disabled={!canUndo}
        className={btnClass(false)}
        onClick={onUndo}
      >
        <Undo2 className="h-5 w-5" />
      </button>

      <button
        type="button"
        title="Refazer"
        aria-label="Refazer"
        disabled={!canRedo}
        className={btnClass(false)}
        onClick={onRedo}
      >
        <Redo2 className="h-5 w-5" />
      </button>

      <div className="mx-1 h-6 w-px bg-zinc-200" />

      <button
        type="button"
        title="Zoom out"
        aria-label="Zoom out"
        disabled={zoomPct <= 20}
        className={btnClass(false)}
        onClick={onZoomOut}
      >
        <Minus className="h-4 w-4" />
      </button>

      <button
        type="button"
        title="Resetar zoom (100%)"
        aria-label={`Zoom ${zoomPct}%`}
        className="h-9 min-w-[3rem] rounded-full px-2 text-xs font-mono font-semibold text-zinc-600 hover:bg-zinc-100 transition tabular-nums"
        onClick={onZoomReset}
      >
        {zoomPct}%
      </button>

      <button
        type="button"
        title="Zoom in"
        aria-label="Zoom in"
        disabled={zoomPct >= 500}
        className={btnClass(false)}
        onClick={onZoomIn}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
