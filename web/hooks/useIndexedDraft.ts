"use client";

import { useEffect, useRef, useState } from "react";
import { saveDraft, getDraft, deleteDraft } from "@/lib/drafts";

const ONE_HOUR = 60 * 60 * 1000;

export function useIndexedDraft<T = any>(draftId?: string | null, initial?: T) {
  const [value, setValue] = useState<T>((initial as T) ?? ({} as T));
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount/id change
  useEffect(() => {
    let active = true;
    // pause saves until we finish loading the new key
    setLoaded(false);
    (async () => {
      if (!draftId) {
        setLoaded(true);
        return;
      }
      try {
        const data: any = await getDraft<T>(draftId);
        if (!active) return;
        if (data && Date.now() - (data.updated_at || 0) < ONE_HOUR) {
          setValue(data.value as T);
        } else if (data) {
          await deleteDraft(draftId);
        }
      } catch (e) {}
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [draftId]);

  // Debounced save on change
  useEffect(() => {
    if (!draftId) return;
    if (!loaded) return; // avoid saving initial before load completes
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDraft(draftId, value).catch(() => {});
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, draftId, loaded]);

  const clear = async () => {
    try {
      if (draftId) await deleteDraft(draftId);
    } catch (e) {}
  };

  return [value, setValue, clear, loaded] as const;
}
