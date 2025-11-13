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
import { listMyMentionCardIds } from "@/features/inbox/services";
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
      myMentions: sp.get('minhas_mencoes') === '1',
    }),
    [responsaveis, prazo, prazoFim, hora]
  );
  const [filtersSummary, setFiltersSummary] = useState<AppliedFilters>(initialFiltersSummary);
  const [cardsSnapshot, setCardsSnapshot] = useState<KanbanCard[]>([]);
  const [mentionCardIds, setMentionCardIds] = useState<string[] | null>(null);
  
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

  useEffect(() => {
    let active = true;
    (async () => {
      if (filtersSummary.myMentions) {
        const ids = await listMyMentionCardIds();
        if (!active) return;
        setMentionCardIds(ids);
      } else {
        setMentionCardIds(null);
      }
    })();
    return () => { active = false; };
  }, [filtersSummary.myMentions]);

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
      <div id="kanban-page-root" className="flex flex-1 min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-20 border-b border-white/40 bg-[var(--neutro)] px-3 pb-4 pt-3 shadow-[0_6px_16px_rgba(0,0,0,0.05)] md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterCTA area="comercial" onFiltersChange={handleFiltersChange} />
              <Button
                onClick={() => setOpenPersonType(true)}
                className="h-9 shrink-0 bg-emerald-600 text-sm text-white hover:bg-emerald-700"
                style={{ paddingLeft: '18px', paddingRight: '18px', borderRadius: '10px' }}
              >
                <Plus className="mr-2 size-6" />
                Nova ficha
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4 md:gap-6">
              <DashboardCard title="Fichas feitas" value={dashboard.feitasAguardando} icon={<FileCheck className="h-4 w-4 text-white" />} />
              <DashboardCard title="Canceladas" value={dashboard.canceladas} icon={<XCircle className="h-4 w-4 text-white" />} />
              <DashboardCard title="Concluídas" value={dashboard.concluidas} icon={<CheckCircle className="h-4 w-4 text-white" />} />
              <DashboardCard title="Atrasadas" value={dashboard.atrasadas} icon={<Clock className="h-4 w-4 text-white" />} />
            </div>
          </div>
          <div className="px-1 pb-6 pt-4 md:px-3">
            <KanbanBoard
              hora={filtersSummary.hora}
              dateStart={filtersSummary.prazo?.start}
              dateEnd={filtersSummary.prazo?.end}
              openCardId={openCardId}
              responsaveis={filtersSummary.responsaveis.length > 0 ? filtersSummary.responsaveis : undefined}
              allowedCardIds={mentionCardIds ?? undefined}
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
