"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FilterCTA } from "./filter-cta";

export function FilterPortal() {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Função para encontrar o container
    const findContainer = () => {
      const element = document.getElementById("filter-cta-container");
      if (element) {
        setContainer(element);
        return true;
      }
      return false;
    };

    // Tenta encontrar imediatamente
    if (findContainer()) {
      return;
    }

    // Se não encontrou, tenta periodicamente
    const interval = setInterval(() => {
      if (findContainer()) {
        clearInterval(interval);
      }
    }, 100);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  // Se não há container, não renderiza nada
  if (!container) {
    return null;
  }

  return createPortal(<FilterCTA />, container);
}
