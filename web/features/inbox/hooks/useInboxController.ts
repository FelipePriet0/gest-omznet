"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { listInbox } from "@/features/inbox/services";
import type { InboxItem, NotificationType } from "@/features/inbox/types";

export function useInboxController(panelOpen: boolean) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const HIDDEN_TYPES: NotificationType[] = ["ass_app", "fichas_atrasadas"];

  const unread = useMemo(
    () => items.filter((i) => !i.read_at && !HIDDEN_TYPES.includes(i.type as NotificationType)).length,
    [items]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await listInbox();
      if (mountedRef.current) setItems(next);
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
          if (!active) return;
          setUid(null);
          setItems([]);
          return;
        }
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        const userId = data.user?.id ?? null;
        setUid(userId);
        if (userId) await refresh();
        else setItems([]);
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!uid) return;
    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const channel = supabase
      .channel(`inbox-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inbox_notifications", filter: `user_id=eq.${uid}` },
        () => void refresh()
      );
    const sub = channel.subscribe((status) => {
      // Em erro, remove o canal para evitar loops/logs
      if (status === "CHANNEL_ERROR") {
        try { supabase.removeChannel(channel); } catch {}
      }
    });
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [uid, refresh]);

  useEffect(() => {
    if (panelOpen) void refresh();
  }, [panelOpen, refresh]);

  return { items, unread, refresh } as const;
}
