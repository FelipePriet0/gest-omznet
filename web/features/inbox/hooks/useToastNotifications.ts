"use client";

import { useEffect, useRef, useState } from "react";
import type { InboxItem } from "@/features/inbox/types";

export function useToastNotifications(items: InboxItem[], loginAt: Date | null) {
  const [toasts, setToasts] = useState<InboxItem[]>([]);
  const previousItemsRef = useRef<Set<string>>(new Set());
  const dismissedToastsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Criar Set com IDs das notificações atuais
    const currentIds = new Set(items.map(item => item.id));
    
    // Encontrar novas notificações (não lidas, não estão no previous, não foram dismissadas)
    const newItems = items.filter(item => {
      const isNew = !previousItemsRef.current.has(item.id);
      const isUnread = !item.read_at;
      const notDismissed = !dismissedToastsRef.current.has(item.id);
      
      // NOVA REGRA: Só mostrar toast se foi criada APÓS o login
      const createdAfterLogin = loginAt 
        ? new Date(item.created_at) > loginAt
        : true; // Se não há timestamp de login, mostrar (fallback)
      
      return isNew && isUnread && notDismissed && createdAfterLogin;
    });

    // Adicionar novos toasts
    if (newItems.length > 0) {
      setToasts(prev => [...prev, ...newItems]);
    }

    // Atualizar referência
    previousItemsRef.current = currentIds;
  }, [items, loginAt]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    dismissedToastsRef.current.add(id);
  };

  return { toasts, dismissToast };
}

