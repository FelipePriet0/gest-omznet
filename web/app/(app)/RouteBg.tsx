"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function RouteBg({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPerfil = pathname?.startsWith("/perfil");
  const bgClass = isPerfil ? "bg-[#bdbdbd]" : "bg-white";
  return <div className={`min-h-dvh ${bgClass}`}>{children}</div>;
}

