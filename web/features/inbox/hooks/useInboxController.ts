"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { listInbox } from "@/features/inbox/services";
import type { InboxItem, NotificationType } from "@/features/inbox/types";

const HIDDEN_TYPES: NotificationType[] = ["ass_app", "fichas_atrasadas"];

// ── Polling intervals ──────────────────────────────────────────────────────
const POLL_ACTIVE = 3_000; // 3s quando drawer aberto
const POLL_BG = 6_000; // 6s quando drawer fechado
const RT_DEBOUNCE = 400; // debounce para eventos do realtime

export function useInboxController(panelOpen: boolean) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const mountedRef = useRef(true);
  const rtDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: apply realtime payload immediately for instant UX feedback
  const mergeRealtime = useCallback((payload: any) => {
    try {
      const type = payload?.eventType;
      const row = payload?.new ?? null;
      const oldRow = payload?.old ?? null;
      if (!type) return;

      setItems((prev) => {
        if (type === 'INSERT' && row) {
          // Prepend if not already present
          if (prev.some((i) => i.id === row.id)) return prev;
          const nextItem = {
            id: row.id,
            user_id: row.user_id,
            type: row.type,
            priority: row.priority ?? null,
            author_name: row.author_name ?? null,
            primary_name: row.primary_name ?? null,
            content: row.content ?? null,
            title: row.title ?? null,
            body: row.body ?? null,
            meta: row.meta ?? null,
            card_id: row.card_id ?? null,
            comment_id: row.comment_id ?? null,
            link_url: row.link_url ?? null,
            expires_at: row.expires_at ?? null,
            read_at: row.read_at ?? null,
            created_at: row.created_at ?? null,
            applicant_id: row.applicant_id ?? null,
          } as any;
          return [nextItem, ...prev];
        }
        if (type === 'UPDATE' && row) {
          return prev.map((i) => (i.id === row.id ? { ...i, ...row } : i));
        }
        if (type === 'DELETE' && oldRow) {
          return prev.filter((i) => i.id !== oldRow.id);
        }
        return prev;
      });
    } catch {}
  }, []);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const unread = useMemo(
    () =>
      items.filter(
        (i) =>
          !i.read_at &&
          !HIDDEN_TYPES.includes(i.type as NotificationType),
      ).length,
    [items],
  );

  // ── Core refresh ───────────────────────────────────────────────────────
  // Não depende de uid — o RPC usa auth.uid() server-side.
  // Se não há sessão ativa, o RPC retorna vazio (sem erro).
  const refresh = useCallback(async () => {
    if (!mountedRef.current || !isSupabaseConfigured) return;
    try {
      const next = await listInbox();
      if (mountedRef.current) setItems(next);
    } catch {
      // listInbox já loga o warning internamente
    }
  }, []);

  // ── Fetch inicial ────────────────────────────────────────────────────
  useEffect(() => {
    let removed = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (removed) return;
        if (session?.user?.id) {
          void refresh();
        }
      } catch {}
    })();

    // Refrescar também nos eventos de auth (inclui INITIAL_SESSION em supabase-js v2)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (removed) return;
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user?.id) {
        void refresh();
      }
      if (event === 'SIGNED_OUT') {
        setItems([]);
      }
    });
    return () => { removed = true; subscription.unsubscribe(); };
  }, [refresh]);

  // ── Polling (principal mecanismo — SEMPRE roda) ─────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const ms = panelOpen ? POLL_ACTIVE : POLL_BG;
    const timer = setInterval(() => {
      if (mountedRef.current) void refresh();
    }, ms);
    return () => clearInterval(timer);
  }, [panelOpen, refresh]);

  // ── Realtime (bônus — acelera detecção, mas não é necessário) ───────
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let removed = false;
    let cleanupChannel: (() => void) | null = null;

    const setupChannel = (uid: string) => {
      if (removed) return;
      const channel = supabase
        .channel(`inbox-rt-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "inbox_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            if (removed) return;
            // Merge immediately for snappy UI
            mergeRealtime(payload);
            // Then debounce a full refresh to hydrate computed fields
            if (rtDebounceRef.current) clearTimeout(rtDebounceRef.current);
            rtDebounceRef.current = setTimeout(() => {
              if (mountedRef.current) void refresh();
            }, RT_DEBOUNCE);
          },
        )
        .subscribe((status) => {
          if (removed) return;
          if (status === "SUBSCRIBED") void refresh();
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[Inbox] Realtime channel issue:", status);
          }
        });

      cleanupChannel = () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    };

    // Tentar pegar uid da sessão atual (pode não estar pronta ainda)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (uid && !removed) setupChannel(uid);
    });

    // Escutar mudanças de auth para recriar o channel se necessário
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (removed) return;
        const uid = session?.user?.id;
        // Limpar channel anterior
        if (cleanupChannel) {
          cleanupChannel();
          cleanupChannel = null;
        }
        if (uid) setupChannel(uid);
      },
    );

    return () => {
      removed = true;
      if (rtDebounceRef.current) {
        clearTimeout(rtDebounceRef.current);
        rtDebounceRef.current = null;
      }
      if (cleanupChannel) cleanupChannel();
      subscription.unsubscribe();
    };
  }, [refresh]);

  // ── Refresh quando drawer abre ────────────────────────────────────────
  useEffect(() => {
    if (panelOpen) void refresh();
  }, [panelOpen, refresh]);

  // ── Refresh ao voltar para a aba ──────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && mountedRef.current) void refresh();
    };
    const handleFocus = () => {
      if (mountedRef.current) void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  return { items, unread, refresh } as const;
}
