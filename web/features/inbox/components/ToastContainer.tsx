"use client";

import { useState, useEffect, useRef } from "react";
import { ToastNotification } from "./ToastNotification";
import { useToastNotifications } from "../hooks/useToastNotifications";
import { useInbox } from "../InboxDrawer";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { InboxItem } from "../types";

// LEI 2 - Função Escada: Constantes de posicionamento
const SCALE_FACTOR = 0.03; // Redução de escala (3% por nível)
const GAP_TOP = 6; // LEI 2: Gap fixo de 6px entre as bordas superiores dos cards
const HORIZONTAL_OFFSET = 8; // Offset horizontal para esquerda (em pixels)
const BARRA_HEIGHT = 14; // Altura da barra horizontal
const MIN_SPACE_ABOVE_BARRA = 22; // Espaço mínimo desejado acima da barra
const DESIRED_BOTTOM = BARRA_HEIGHT + MIN_SPACE_ABOVE_BARRA; // 36px
const MIN_MARGIN_TOP = 20; // Margem mínima do topo da tela

// Nova regra de empilhamento visual:
// 1 notificação = 0 empilhadas (só 1 visível)
// 2 notificações = 1 empilhada (2 visíveis)
// 3 notificações = 2 empilhadas (3 visíveis)
// 4 notificações = 3 empilhadas (4 visíveis)
// 5+ notificações = 4 empilhadas (máximo 4 visíveis)
function getMaxStackedVisible(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1; // Sem empilhamento
  if (count === 2) return 2; // 1 empilhada
  if (count === 3) return 3; // 2 empilhadas
  if (count === 4) return 4; // 3 empilhadas
  return 4; // 5+ = 4 empilhadas (máximo)
}

export function ToastContainer() {
  const { items } = useInbox();
  const { toasts, dismissToast } = useToastNotifications(items);
  const router = useRouter();
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const [showCompleted, setShowCompleted] = useState(toasts.length > 0);
  const [bottomOffset, setBottomOffset] = useState(DESIRED_BOTTOM);
  const [activeIndex, setActiveIndex] = useState(0); // Índice do toast mais à frente (0 = mais recente)
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const cardCount = toasts.length;
  const maxStacked = getMaxStackedVisible(cardCount);
  
  // Ref para rastrear o ID do toast mais recente
  const previousMostRecentIdRef = useRef<string | null>(null);
  
  // Resetar activeIndex quando um novo toast chega (mais recente)
  useEffect(() => {
    // Se um novo toast chegou (mais recente), resetar para mostrar ele na frente
    if (cardCount > 0) {
      // Ordenar para encontrar o mais recente por data
      const sorted = [...toasts].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // Ordem decrescente: mais recente primeiro
      });
      const mostRecentId = sorted[0]?.id;
      
      if (mostRecentId && mostRecentId !== previousMostRecentIdRef.current) {
        // Novo toast chegou, resetar para mostrar o mais recente
        setActiveIndex(0);
        previousMostRecentIdRef.current = mostRecentId;
      }
    } else {
      // Se não há toasts, resetar a referência
      previousMostRecentIdRef.current = null;
    }
  }, [cardCount, toasts]);

  // Calcular posicionamento dinâmico para garantir que o card apareça inteiro
  useEffect(() => {
    if (cardCount === 0) return;

    const calculatePosition = () => {
      if (!cardRef.current) return;

      const viewportHeight = window.innerHeight;
      // LEI 1: Tamanho Fixo - altura fixa de 180px
      const cardHeight = 180;
      
      // Altura mínima necessária: altura do card + margem do topo
      const minNeededHeight = cardHeight + MIN_MARGIN_TOP;
      
      // Altura disponível acima da barra
      const availableHeight = viewportHeight - BARRA_HEIGHT;
      
      // Se a altura disponível for menor que a necessária, ajustar o bottom
      if (availableHeight < minNeededHeight) {
        // Calcular o bottom necessário para garantir que o card caiba
        const calculatedBottom = viewportHeight - minNeededHeight;
        // Garantir que sempre fique pelo menos 10px acima da barra
        setBottomOffset(Math.max(BARRA_HEIGHT + 10, calculatedBottom));
      } else {
        // Usar o espaço desejado (164px), mas garantir que não ultrapasse o topo
        const maxBottom = viewportHeight - minNeededHeight;
        setBottomOffset(Math.min(DESIRED_BOTTOM, maxBottom));
      }
    };

    // Calcular após o primeiro render
    const timeout = setTimeout(() => {
      calculatePosition();
      
      // Observar mudanças na altura do card após o primeiro cálculo
      if (cardRef.current && typeof ResizeObserver !== 'undefined') {
        // Desconectar observer anterior se existir
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
        
        // Criar novo observer
        resizeObserverRef.current = new ResizeObserver(() => {
          calculatePosition();
        });
        resizeObserverRef.current.observe(cardRef.current);
      }
    }, 100);
    
    // Recalcular ao redimensionar a janela
    window.addEventListener('resize', calculatePosition);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', calculatePosition);
      // Desconectar observer no cleanup
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [cardCount]);

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined = undefined;
    if (cardCount === 0) {
      timeout = setTimeout(() => setShowCompleted(false), 2700);
    } else {
      setShowCompleted(true);
    }
    return () => clearTimeout(timeout);
  }, [cardCount]);

  const handleClick = (item: InboxItem) => {
    // Abrir drawer
    const params = new URLSearchParams(search?.toString() ?? "");
    params.set("panel", "inbox");
    const query = params.size ? `?${params.toString()}` : "";
    router.push(`${pathname}${query}`, { scroll: false });

    // Fechar toast
    dismissToast(item.id);
  };

  // Handler para quando o toast da frente é arrastado e deve revelar o próximo
  const handleRevealNext = () => {
    // Só revelar próximo se houver mais toasts
    if (activeIndex < cardCount - 1) {
      setActiveIndex(prev => prev + 1);
    }
  };

  if (!toasts.length && !showCompleted) return null;

  // IMPORTANTE: Ordenar por data (mais antigo primeiro) e depois inverter
  // para garantir que o mais recente fique no índice 0 (na frente)
  const sortedToasts = [...toasts].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB; // Ordem crescente: mais antigo primeiro
  });
  
  // Agora inverter: reversedToasts[0] = Card 7 (16:10) - mais recente - NA FRENTE
  // reversedToasts[1] = Card 6 (15:10)
  // ...
  // reversedToasts[6] = Card 1 (11:10) - mais antigo - ATRÁS
  const reversedToasts = sortedToasts.reverse();

  return (
    <div
      ref={containerRef}
      className="fixed right-4 z-[100] group pointer-events-none"
      style={{
        bottom: `${bottomOffset}px`,
        maxHeight: `calc(100vh - ${bottomOffset}px - ${MIN_MARGIN_TOP}px)`,
      }}
      data-active={cardCount !== 0}
    >
      {/* LEI 1: Tamanho Fixo - Container com largura fixa de 380px */}
      <div className="relative w-[380px]">
        {/* LEI 2: Ordenação por recência - toast mais recente sempre na frente */}
        {reversedToasts.map((toast, idx) => {
          // Calcular se este toast deve estar visível no empilhamento
          // Mostramos apenas os toasts a partir do activeIndex até activeIndex + maxStacked - 1
          const isInVisibleRange = idx >= activeIndex && idx < activeIndex + maxStacked;
          const isFirstCard = idx === activeIndex; // Primeiro toast visível (mais à frente)
          
          // Se não está no range visível, não renderizar
          if (!isInVisibleRange) {
            return null;
          }

          // LEI 2 - Função Escada: Calcular o índice na pilha visual
          // stackIndex 0 = toast mais recente visível (frente), aumenta para toasts de trás
          const stackIndex = idx - activeIndex;
          
          // LEI 2: Gap fixo de 6px entre bordas superiores (a borda superior do toast de trás fica 6px acima)
          const verticalOffset = stackIndex * GAP_TOP;
          
          // LEI 2: Offset horizontal - cards de trás ficam deslocados para esquerda
          const horizontalOffset = stackIndex * HORIZONTAL_OFFSET;
          
          // Se é o toast da frente (stackIndex === 0), pode ser arrastado para revelar próximo
          const isFrontToast = stackIndex === 0;
          
          return (
            <div
              key={toast.id}
              ref={isFirstCard ? cardRef : undefined}
              className={cn(
                "absolute left-0 top-0 w-full scale-[var(--scale)] transition-[opacity,transform] duration-200 pointer-events-auto"
              )}
              style={
                {
                  "--y": `-${verticalOffset}px`,
                  "--x": `-${horizontalOffset}px`,
                  "--scale": 1 - stackIndex * SCALE_FACTOR, // LEI 2: Escala decrescente (1.0 na frente, menor atrás)
                  zIndex: maxStacked - stackIndex, // LEI 2: Toast mais recente (stackIndex=0) tem z-index maior, fica por cima
                } as React.CSSProperties
              }
            >
              <ToastNotification
                item={toast}
                onDismiss={() => dismissToast(toast.id)}
                onClick={() => handleClick(toast)}
                onRevealNext={isFrontToast && activeIndex < cardCount - 1 ? handleRevealNext : undefined}
                isFrontToast={isFrontToast}
              />
            </div>
          );
        })}
        {/* Placeholder invisível para manter altura - LEI 1: Tamanho Fixo (180px) */}
        <div className="pointer-events-none invisible" aria-hidden>
          <div className="h-[180px]" />
        </div>
      </div>
    </div>
  );
}

