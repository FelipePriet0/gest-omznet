"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function RouteBg({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPerfil = pathname?.startsWith("/perfil");
  const isKanban = pathname?.startsWith("/kanban");
  const bgClass = isPerfil || isKanban ? "bg-[#e4e4e4]" : "bg-white";
  return <div className={`min-h-dvh ${bgClass}`}>{children}</div>;
}
