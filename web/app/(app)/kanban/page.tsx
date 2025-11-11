"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { KanbanBoard } from "@/legacy/components/kanban/components/KanbanBoard";
import { FilterCTA, AppliedFilters } from "@/components/app/filter-cta";
import { Button } from "@/components/ui/button";
import { Plus, FileCheck, XCircle, CheckCircle, Clock } from "lucide-react";
import { useState as useModalState } from "react";
import { PersonTypeModal } from "@/legacy/components/cadastro/components/PersonTypeModal";
import { BasicInfoModal } from "@/legacy/components/cadastro/components/BasicInfoModal";
import type { PessoaTipo } from "@/features/cadastro/types";
import { supabase, clearStaleSupabaseSession } from "@/lib/supabaseClient";
import { KanbanCard } from "@/features/kanban/types";

export default function KanbanPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const hora = sp.get("hora") || undefined;
  const prazo = sp.get("prazo") || undefined;
  const prazoFim = sp.get("prazo_fim") || undefined;
  const responsavelParam = sp.get("responsavel") || "";
  const responsaveis = useMemo(() => {
    if (!responsavelParam) return [] as string[];
    const unique = Array.from(
      new Set(
        responsavelParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );
    return unique;
  }, [responsavelParam]);
  const openCardId = sp.get("card") || undefined;
  const initialFiltersSummary = useMemo<AppliedFilters>(
    () => ({
      responsaveis,
      prazo: prazo
        ? { start: prazo, end: prazoFim || undefined }
        : undefined,
      hora: hora || undefined,
    }),
    [responsaveis, prazo, prazoFim, hora]
  );
  const [filtersSummary, setFiltersSummary] = useState<AppliedFilters>(initialFiltersSummary);
  const [cardsSnapshot, setCardsSnapshot] = useState<KanbanCard[]>([]);
  
  // Nova ficha modals
  const [openPersonType, setOpenPersonType] = useModalState(false);
  const [openBasicInfo, setOpenBasicInfo] = useModalState(false);
  const [tipoSel, setTipoSel] = useModalState<PessoaTipo | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setLoading(false);
      } catch {
        clearStaleSupabaseSession();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    setFiltersSummary((prev) => {
      const sameResponsaveis = prev.responsaveis.join("|") === initialFiltersSummary.responsaveis.join("|");
      const samePrazo =
        (prev.prazo?.start ?? "") === (initialFiltersSummary.prazo?.start ?? "") &&
        (prev.prazo?.end ?? "") === (initialFiltersSummary.prazo?.end ?? "");
      const sameHora = prev.hora === initialFiltersSummary.hora;
      if (sameResponsaveis && samePrazo && sameHora) {
        return prev;
      }
      return initialFiltersSummary;
    });
  }, [initialFiltersSummary]);

  const handleFiltersChange = useCallback((next: AppliedFilters) => {
    setFiltersSummary(next);
  }, []);

  const handleCardModalClose = useCallback(() => {
    const params = new URLSearchParams(sp.toString());
    if (!params.has("card")) return;
    params.delete("card");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, sp]);

  const dashboard = useMemo(() => computeCommercialDashboard(cardsSnapshot), [cardsSnapshot]);

  if (loading) {
    return <div className="text-sm text-zinc-600">Carregando…</div>;
  }

  return (
    <>
      <div id="kanban-page-root" className="relative">
        <div className="absolute top-0 left-0 z-10">
          <FilterCTA area="comercial" onFiltersChange={handleFiltersChange} />
        </div>
        <div className="absolute top-0 right-0 z-10">
          <Button
            onClick={() => setOpenPersonType(true)}
            className="h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
            style={{ paddingLeft: '18px', paddingRight: '18px', borderRadius: '10px' }}
          >
            <Plus className="size-6 mr-2" />
            Nova ficha
          </Button>
        </div>
        <div className="pt-12">
          {/* Mini dashboard: Fichas feitas / Canceladas / Concluídas / Atrasadas */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4 md:gap-6 w-full mb-6">
            <DashboardCard title="Fichas feitas" value={dashboard.feitasAguardando} icon={<FileCheck className="w-4 h-4 text-white" />} />
            <DashboardCard title="Canceladas" value={dashboard.canceladas} icon={<XCircle className="w-4 h-4 text-white" />} />
            <DashboardCard title="Concluídas" value={dashboard.concluidas} icon={<CheckCircle className="w-4 h-4 text-white" />} />
            <DashboardCard title="Atrasadas" value={dashboard.atrasadas} icon={<Clock className="w-4 h-4 text-white" />} />
          </div>
          {/* Espaçamento igual ao usado entre filtros/CTA e colunas */}
          <div className="mt-12">
            <KanbanBoard
              hora={filtersSummary.hora}
              dateStart={filtersSummary.prazo?.start}
              dateEnd={filtersSummary.prazo?.end}
              openCardId={openCardId}
              responsaveis={filtersSummary.responsaveis.length > 0 ? filtersSummary.responsaveis : undefined}
              onCardsChange={setCardsSnapshot}
            onCardModalClose={handleCardModalClose}
            />
          </div>
        </div>

        {/* Modals de Cadastro — escopados ao Kanban */}
        <PersonTypeModal
          open={openPersonType}
          onClose={() => setOpenPersonType(false)}
          onSelect={(tipo) => {
            setTipoSel(tipo);
            setOpenPersonType(false);
            setOpenBasicInfo(true);
          }}
        />
        <BasicInfoModal
          open={openBasicInfo}
          tipo={tipoSel}
          onBack={() => {
            setOpenBasicInfo(false);
            setOpenPersonType(true);
          }}
          onClose={() => {
            setOpenBasicInfo(false);
            setTipoSel(null);
          }}
        />
      </div>
    </>
  );
}

function DashboardCard({ title, value, icon }: { title: string; value?: number | null; icon?: React.ReactNode }) {
  return (
    <div className="h-[120px] w-full rounded-[12px] border bg-white border-zinc-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header Band (faixa de cabeçalho) */}
      <div className="bg-[#000000] px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-medium text-white">{title}</div>
        {icon && <div className="text-white">{icon}</div>}
      </div>
      {/* Área do número */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-3xl font-bold text-[var(--verde-primario)]">{typeof value === 'number' ? value : '—'}</div>
      </div>
    </div>
  );
}

type CommercialDashboard = {
  feitasAguardando: number;
  canceladas: number;
  concluidas: number;
  atrasadas: number;
};

function computeCommercialDashboard(cards: KanbanCard[]): CommercialDashboard {
  const now = new Date();
  const normalizeStage = (stage?: string | null) => (stage ?? "").toLowerCase();
  let feitasAguardando = 0;
  let canceladas = 0;
  let concluidas = 0;
  let atrasadas = 0;

  for (const card of cards) {
    const stage = normalizeStage(card.stage);
    if (stage === "feitas" || stage === "aguardando") {
      feitasAguardando += 1;
      if (card.dueAt) {
        const dueDate = new Date(card.dueAt);
        if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() < now.getTime()) {
          atrasadas += 1;
        }
      }
    } else if (stage === "canceladas") {
      canceladas += 1;
    } else if (stage === "concluidas") {
      concluidas += 1;
    }
  }

  return {
    feitasAguardando,
    canceladas,
    concluidas,
    atrasadas,
  };
}
