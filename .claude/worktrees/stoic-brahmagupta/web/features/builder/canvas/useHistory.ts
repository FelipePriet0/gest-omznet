"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

type Updater<T> = T | ((prev: T) => T);

function applyUpdater<T>(prev: T, next: Updater<T>): T {
  return typeof next === "function" ? (next as (p: T) => T)(prev) : next;
}

export function useHistory<T>(initial: T, opts?: { max?: number }) {
  const max = opts?.max ?? 50;
  const [state, setState] = useState<HistoryState<T>>({ past: [], present: initial, future: [] });
  const isApplyingRef = useRef(false);

  const setPresent = useCallback((next: Updater<T>) => {
    setState((s) => ({ ...s, present: applyUpdater(s.present, next) }));
  }, []);

  const commit = useCallback(
    (next: Updater<T>) => {
      setState((s) => {
        const present = applyUpdater(s.present, next);
        const past = [...s.past, s.present];
        const trimmed = past.length > max ? past.slice(past.length - max) : past;
        return { past: trimmed, present, future: [] };
      });
    },
    [max]
  );

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      isApplyingRef.current = true;
      const previous = s.past[s.past.length - 1];
      const past = s.past.slice(0, -1);
      const future = [s.present, ...s.future];
      return { past, present: previous, future };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      isApplyingRef.current = true;
      const next = s.future[0];
      const future = s.future.slice(1);
      const past = [...s.past, s.present];
      const trimmed = past.length > max ? past.slice(past.length - max) : past;
      return { past: trimmed, present: next, future };
    });
  }, [max]);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const api = useMemo(
    () => ({
      present: state.present,
      setPresent,
      commit,
      undo,
      redo,
      canUndo,
      canRedo,
      isApplyingRef,
    }),
    [state.present, setPresent, commit, undo, redo, canUndo, canRedo]
  );

  return api;
}
