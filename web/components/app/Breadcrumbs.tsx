"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

function labelFor(segment: string): string {
  const s = segment.toLowerCase();
  switch (s) {
    case "kanban":
      return "Kanban";
    case "analise":
    case "análise":
      return "Análise";
    case "tarefas":
      return "Minhas Tarefas";
    case "historico":
    case "histórico":
      return "Histórico";
    case "perfil":
      return "Perfil";
    case "cadastro":
      return "Cadastro";
    case "pf":
      return "PF";
    case "pj":
      return "PJ";
    case "ficha":
      return "Ficha";
    default:
      return s.length > 12 ? s.slice(0, 12) + "…" : s;
  }
}

export function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const parts = pathname.split("/").filter(Boolean);

  // Constrói caminhos acumulados para links
  const items = parts.map((seg, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/");
    const isLast = idx === parts.length - 1;
    return { href, label: labelFor(seg), isLast };
  });

  if (items.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className="inline-flex items-center gap-2">
      {items.map((it, idx) => (
        <React.Fragment key={it.href}>
          {it.isLast ? (
            <span className="text-h2 font-semibold text-[var(--color-primary)] truncate">
              {it.label}
            </span>
          ) : (
            <Link
              href={it.href}
              className="text-h2 font-semibold text-[color-mix(in oklab, var(--color-primary) 70%, black)] hover:underline truncate"
            >
              {it.label}
            </Link>
          )}
          {idx < items.length - 1 && (
            <span className="text-h2 font-semibold text-[var(--color-primary)] opacity-60">/</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumbs;
