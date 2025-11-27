"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FilterCTA, type AppliedFilters } from "@/components/app/filter-cta";
import { FilterType } from "@/components/ui/filters";
import { cn } from "@/lib/utils";
import { Calendar, Users, Settings } from "lucide-react";

export default function AgendamentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-600">Carregando…</div>}>
      <AgendamentoLayoutInner>{children}</AgendamentoLayoutInner>
    </Suspense>
  );
}

function AgendamentoLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sp = useSearchParams();

  const initialFilters: AppliedFilters = useMemo(() => {
    const hora = sp.get("hora") || undefined;
    const prazo = sp.get("prazo") || undefined;
    const prazoFim = sp.get("prazo_fim") || undefined;
    const responsavelParam = sp.get("responsavel") || "";
    const busca = sp.get("busca") || undefined;
    const responsaveis = Array.from(
      new Set(
        (responsavelParam || "")
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );
    return {
      responsaveis,
      prazo: prazo ? { start: prazo, end: prazoFim || undefined } : undefined,
      hora: hora || undefined,
      myMentions: sp.get("minhas_mencoes") === "1",
      searchTerm: busca || undefined,
    };
  }, [sp]);

  const [filtersSummary, setFiltersSummary] = useState<AppliedFilters>(initialFilters);

  const isActive = (href: string) => (pathname || "").startsWith(href);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="border-b border-white/40 bg-[var(--neutro)] px-3 pb-4 pt-3 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterCTA
              area="comercial"
              onFiltersChange={setFiltersSummary}
              allowedTypes={[FilterType.PRAZO, FilterType.HORARIO, FilterType.BUSCAR]}
              showMentions={false}
            />
          </div>
          <div className="mt-4 w-full rounded-2xl bg-slate-200 p-1">
            <div className="flex items-center justify-between gap-2">
              <NavChip href="/agendamento/agenda" active={isActive("/agendamento/agenda")} icon={<Calendar className="h-4 w-4" />}>
                Agenda Semanal
              </NavChip>
              <NavChip href="/agendamento/gestao-tecnicos" active={isActive("/agendamento/gestao-tecnicos")} icon={<Users className="h-4 w-4" />}>
                Gestão de Técnicos
              </NavChip>
              <NavChip href="/agendamento/gestao-rotas" active={isActive("/agendamento/gestao-rotas")} icon={<Settings className="h-4 w-4" />}>
                Config. de Rotas
              </NavChip>
            </div>
          </div>
        </div>
        <div className="px-3 pb-6 pt-4 md:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function NavChip({ href, active, children, icon }: { href: string; active?: boolean; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 px-3 h-9 rounded-xl text-sm transition select-none",
        active
          ? "bg-[var(--color-primary)] text-white shadow-sm"
          : "text-zinc-700 hover:bg-[var(--color-primary)] hover:text-white",
      )}
      style={{}}
    >
      {icon}
      <span className="font-medium">{children}</span>
    </Link>
  );
}
