"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { listInbox } from "@/features/inbox/services";
import type { InboxItem, NotificationType } from "@/features/inbox/types";

export function useInboxController(panelOpen: boolean) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const HIDDEN_TYPES: NotificationType[] = ["ass_app", "fichas_atrasadas"];

  const unread = useMemo(
    () => items.filter((i) => !i.read_at && !HIDDEN_TYPES.includes(i.type as NotificationType)).length,
    [items]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const refreshRef = useRef<((force?: boolean) => Promise<void>) | null>(null);
  const panelOpenRef = useRef(panelOpen);
  
  // Atualizar ref sempre que panelOpen mudar
  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);
  
  const refresh = useCallback(async (force = false) => {
    if (!mountedRef.current) return;
    
    // Throttle: não refresh mais de uma vez a cada Xms (exceto se forçado)
    // Quando drawer está aberto, throttle reduzido para 200ms
    const throttleMs = panelOpenRef.current ? 200 : 500;
    const now = Date.now();
    if (!force && now - lastRefreshRef.current < throttleMs) {
      return;
    }
    lastRefreshRef.current = now;

    try {
      const next = await listInbox();
      if (mountedRef.current) {
        setItems(next);
      }
    } catch (err) {
      console.error('Failed to refresh inbox:', err);
    }
  }, []); // Sem dependências - usa refs para valores atuais

  // Atualizar ref sempre que refresh mudar
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Carregamento inicial
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
        if (userId && refreshRef.current) {
          await refreshRef.current(true); // Força refresh inicial
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error('Failed to initialize inbox:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []); // Executar apenas uma vez no mount

  // Realtime subscription com debounce
  useEffect(() => {
    if (!uid) return;
    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    
    let channelRemoved = false;
    const channelName = `inbox-${uid}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "inbox_notifications", 
          filter: `user_id=eq.${uid}` 
        },
        (payload) => {
          if (channelRemoved) return;
          // Debounce: aguarda 200ms antes de refresh para evitar múltiplos refreshes
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          refreshTimeoutRef.current = setTimeout(() => {
            if (refreshRef.current && !channelRemoved) {
              void refreshRef.current(true); // Força refresh quando realtime dispara
            }
          }, 200);
        }
      );
    
    channel.subscribe((status) => {
      if (channelRemoved) return;
      if (status === "SUBSCRIBED") {
        console.log('[Inbox] Realtime subscribed');
        // Refresh imediato ao conectar para garantir sincronização
        if (refreshRef.current) {
          setTimeout(() => {
            void refreshRef.current?.(true);
          }, 300);
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn('[Inbox] Realtime channel error:', status);
        // Tentar refresh via polling como fallback
        if (refreshRef.current) {
          setTimeout(() => {
            void refreshRef.current?.(true);
          }, 1000);
        }
      }
      // CLOSED não precisa de tratamento - é normal no cleanup
    });
    
    return () => {
      channelRemoved = true;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      // Cleanup: remover canal apenas no unmount
      // Usar setTimeout para evitar chamar durante o callback de subscribe
      setTimeout(() => {
        try { 
          supabase.removeChannel(channel);
        } catch (err) {
          // Ignorar erros no cleanup
        }
      }, 0);
    };
  }, [uid]); // Removido refresh das dependências

  // Polling: agressivo quando drawer aberto (1s), leve quando fechado (5s)
  useEffect(() => {
    if (!uid) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }
    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Limpar intervalo anterior se existir
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Polling mais agressivo: 1 segundo quando drawer está aberto, 5 segundos quando fechado
    const interval = panelOpen ? 1000 : 5000;
    pollingIntervalRef.current = setInterval(() => {
      // SEMPRE forçar refresh no polling quando drawer está aberto
      if (refreshRef.current) {
        void refreshRef.current(panelOpenRef.current); // Força quando aberto
      }
    }, interval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [uid, panelOpen]); // Removido refresh das dependências para evitar recriação

  // Refresh imediato quando o drawer abre
  useEffect(() => {
    if (panelOpen && uid) {
      // Refresh imediato ao abrir o drawer
      if (refreshRef.current) {
        void refreshRef.current(true);
      }
    }
  }, [panelOpen, uid]);

  // Refresh quando a janela ganha foco (usuário volta para a aba)
  useEffect(() => {
    if (!uid) return;
    
    const handleFocus = () => {
      if (refreshRef.current) {
        void refreshRef.current(true);
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && refreshRef.current) {
        void refreshRef.current(true);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [uid]);

  return { items, unread, refresh } as const;
}
