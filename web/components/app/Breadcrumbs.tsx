"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    case "agenda":
      return "Agenda";
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

  const search = useSearchParams();
  const from = (search?.get('from') || '').toLowerCase();
  const cardId = search?.get('card') || '';

  const isExpandedCadastro = parts[0] === 'cadastro' && (parts[1] === 'pf' || parts[1] === 'pj') && parts.length >= 3;
  const expandedId = isExpandedCadastro ? parts[2] : null;
  const [expandedApplicantName, setExpandedApplicantName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadName() {
      if (!isExpandedCadastro || !expandedId) { setExpandedApplicantName(null); return; }
      try {
        const { data } = await supabase.from('applicants').select('primary_name').eq('id', expandedId).single();
        if (!active) return;
        setExpandedApplicantName((data as any)?.primary_name || null);
      } catch {
        if (!active) return;
        setExpandedApplicantName(null);
      }
    }
    loadName();
    return () => { active = false; };
  }, [isExpandedCadastro, expandedId]);
  // Constrói caminhos acumulados para links
  const items = parts.map((seg, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/");
    const isLast = idx === parts.length - 1;
    let label = labelFor(seg);
    if (isLast && isExpandedCadastro && expandedApplicantName) {
      label = expandedApplicantName;
    }
    return { href, label, isLast };
  });

  if (items.length === 0) return null;

  // Caso especial: Expanded aberta via CTA "Analisar" → ocultar Cadastro/PF|PJ
  if (isExpandedCadastro && from === 'analisar' && !!cardId) {
    const id = parts[2];
    return (
      <nav aria-label="breadcrumb" className="inline-flex items-center gap-2">
        <a href={`/kanban/analise?card=${cardId}`} className="text-h4 font-semibold text-[color-mix(in oklab, var(--color-primary) 70%, black)] hover:underline truncate">Editar Ficha</a>
        <span className="text-h4 font-semibold text-[var(--color-primary)] opacity-60">/</span>
        <span className="text-h4 font-semibold text-[var(--color-primary)] truncate">{expandedApplicantName || id}</span>
      </nav>
    );
  }

  return (
    <nav aria-label="breadcrumb" className="inline-flex items-center gap-2">
      {items.map((it, idx) => (
        <React.Fragment key={it.href}>
          {it.isLast ? (
            <span className="text-h4 font-semibold text-[var(--color-primary)] truncate">
              {it.label}
            </span>
          ) : (
            <Link
              href={it.href}
              className="text-h4 font-semibold text-[color-mix(in oklab, var(--color-primary) 70%, black)] hover:underline truncate"
            >
              {it.label}
            </Link>
          )}
          {idx < items.length - 1 && (
            <span className="text-h4 font-semibold text-[var(--color-primary)] opacity-60">/</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumbs;
