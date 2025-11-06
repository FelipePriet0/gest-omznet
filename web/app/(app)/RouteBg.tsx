"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function RouteBg({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPerfil = pathname?.startsWith("/perfil");
  const isKanban = pathname?.startsWith("/kanban");
  return <div className="route-bg min-h-dvh">{children}</div>;
}
