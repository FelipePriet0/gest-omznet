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

export function ToastContainer() {
  const { items } = useInbox();
  const { toasts, dismissToast } = useToastNotifications(items);
  const router = useRouter();
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const [showCompleted, setShowCompleted] = useState(toasts.length > 0);
  const [bottomOffset, setBottomOffset] = useState(DESIRED_BOTTOM);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const cardCount = toasts.length;

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

  if (!toasts.length && !showCompleted) return null;

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
        {toasts.toReversed().map((toast, idx) => {
          const isActive = idx === cardCount - 1;
          const isVisible = cardCount - idx <= 3;
          // Usar o primeiro card (último no array reverso) para medir altura
          const isFirstCard = idx === 0;
          
          // LEI 2 - Função Escada: Calcular o índice na pilha
          // stackIndex 0 = toast mais recente (frente), aumenta para toasts de trás
          const stackIndex = cardCount - (idx + 1);
          
          // LEI 2: Gap fixo de 6px entre bordas superiores (a borda superior do toast de trás fica 6px acima)
          const verticalOffset = stackIndex * GAP_TOP;
          
          // LEI 2: Offset horizontal - cards de trás ficam deslocados para esquerda
          const horizontalOffset = stackIndex * HORIZONTAL_OFFSET;
          
          return (
            <div
              key={toast.id}
              ref={isFirstCard ? cardRef : undefined}
              className={cn(
                "absolute left-0 top-0 w-full scale-[var(--scale)] transition-[opacity,transform] duration-200 pointer-events-auto",
                !isVisible
                  ? [
                      "opacity-0 sm:group-hover:translate-y-[var(--y)] sm:group-hover:translate-x-[var(--x)] sm:group-hover:opacity-100",
                      "sm:group-has-[*[data-dragging=true]]:translate-y-[var(--y)] sm:group-has-[*[data-dragging=true]]:translate-x-[var(--x)] sm:group-has-[*[data-dragging=true]]:opacity-100",
                    ]
                  : "translate-y-[var(--y)] translate-x-[var(--x)] opacity-100" // LEI 2: Todos os toasts visíveis têm 100% de opacidade
              )}
              style={
                {
                  "--y": `-${verticalOffset}px`,
                  "--x": `-${horizontalOffset}px`,
                  "--scale": 1 - stackIndex * SCALE_FACTOR, // LEI 2: Escala decrescente (1.0 na frente, menor atrás)
                  zIndex: cardCount - idx, // LEI 2: Toast mais recente (idx=0) tem z-index maior, fica por cima
                } as React.CSSProperties
              }
              aria-hidden={!isActive}
            >
              <ToastNotification
                item={toast}
                onDismiss={() => dismissToast(toast.id)}
                onClick={() => handleClick(toast)}
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

