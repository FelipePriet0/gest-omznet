"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KanbanBoardAnalise } from "@/legacy/components/kanban/components/KanbanBoardAnalise";
import { FilterCTA, AppliedFilters } from "@/components/app/filter-cta";
import { Button } from "@/components/ui/button";
import { Plus, Inbox, FileSearch, CheckCircle, AppWindow, Clock, XCircle } from "lucide-react";
import { useState as useModalState } from "react";
import { PersonTypeModal } from "@/legacy/components/cadastro/components/PersonTypeModal";
import { BasicInfoModal } from "@/legacy/components/cadastro/components/BasicInfoModal";
import type { PessoaTipo } from "@/features/cadastro/types";
import { supabase, clearStaleSupabaseSession } from "@/lib/supabaseClient";
import { KanbanCard } from "@/features/kanban/types";

export default function KanbanAnalisePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sp = useSearchParams();
  const hora = sp.get('hora') || undefined;
  const prazo = sp.get('prazo') || undefined;
  const openCardId = sp.get('card') || undefined;
  const responsavelParam = sp.get('responsavel') || '';
  const atribuicaoParam = sp.get('atribuicao') || undefined;
  const responsaveis = useMemo(() => {
    if (!responsavelParam) return [] as string[];
    return Array.from(
      new Set(
        responsavelParam
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );
  }, [responsavelParam]);
  const initialFiltersSummary = useMemo<AppliedFilters>(
    () => ({
      responsaveis,
      prazo: prazo || undefined,
      hora: hora || undefined,
      atribuicao: atribuicaoParam === 'mentions' ? 'mentions' : undefined,
    }),
    [responsaveis, prazo, hora, atribuicaoParam]
  );
  const [filtersSummary, setFiltersSummary] = useState<AppliedFilters>(initialFiltersSummary);
  const [cardsSnapshot, setCardsSnapshot] = useState<KanbanCard[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
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
        setUserId(data.user.id ?? null);
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
      const samePrazo = prev.prazo === initialFiltersSummary.prazo;
      const sameHora = prev.hora === initialFiltersSummary.hora;
      const sameAttr = prev.atribuicao === initialFiltersSummary.atribuicao;
      if (sameResponsaveis && samePrazo && sameHora && sameAttr) {
        return prev;
      }
      return initialFiltersSummary;
    });
  }, [initialFiltersSummary]);

  const handleFiltersChange = useCallback((next: AppliedFilters) => {
    setFiltersSummary(next);
  }, []);

  const dashboard = useMemo(() => computeAnaliseDashboard(cardsSnapshot), [cardsSnapshot]);

  if (loading) {
    return <div className="text-sm text-zinc-600">Carregando…</div>;
  }

  return (
    <>
      <div className="relative">
        <div className="absolute top-0 left-0 z-10">
          <FilterCTA area="analise" onFiltersChange={handleFiltersChange} />
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
          {/* Mini dashboard: A Avaliar / Em análise / Avaliadas / Ass APP / Atrasadas / Canceladas */}
          <div className="grid grid-cols-6 gap-3 sm:gap-4 md:gap-6 w-full mb-6">
            <DashboardCard title="A Avaliar" value={dashboard.avaliar} icon={<Inbox className="w-4 h-4 text-white" />} />
            <DashboardCard title="Em análise" value={dashboard.emAnalise} icon={<FileSearch className="w-4 h-4 text-white" />} />
            <DashboardCard title="Avaliadas" value={dashboard.avaliadas} icon={<CheckCircle className="w-4 h-4 text-white" />} />
            <DashboardCard title="Ass APP" value={dashboard.assApp} icon={<AppWindow className="w-4 h-4 text-white" />} />
            <DashboardCard title="Atrasadas" value={dashboard.atrasadas} icon={<Clock className="w-4 h-4 text-white" />} />
            <DashboardCard title="Canceladas" value={dashboard.canceladas} icon={<XCircle className="w-4 h-4 text-white" />} />
          </div>
          {/* Espaçamento igual ao usado entre filtros/CTA e colunas */}
          <div className="mt-12">
            <KanbanBoardAnalise
              hora={filtersSummary.hora}
              date={filtersSummary.prazo}
              responsaveis={filtersSummary.responsaveis.length > 0 ? filtersSummary.responsaveis : undefined}
              mentionsUserId={filtersSummary.atribuicao === 'mentions' ? userId ?? undefined : undefined}
              mentionsOnly={filtersSummary.atribuicao === 'mentions'}
              openCardId={openCardId}
              onCardsChange={setCardsSnapshot}
            />
          </div>
        </div>
      </div>
      
      {/* Modals de Cadastro */}
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

type AnaliseDashboard = {
  avaliar: number;
  emAnalise: number;
  avaliadas: number;
  assApp: number;
  atrasadas: number;
  canceladas: number;
};

function computeAnaliseDashboard(cards: KanbanCard[]): AnaliseDashboard {
  const normalizeStage = (stage?: string | null) => (stage ?? '').toLowerCase();
  const now = new Date();
  const nowTime = now.getTime();

  let avaliar = 0;
  let emAnalise = 0;
  let avaliadas = 0;
  let assApp = 0;
  let atrasadas = 0;
  let canceladas = 0;

  for (const card of cards) {
    const stage = normalizeStage(card.stage);
    switch (stage) {
      case 'recebidos':
        avaliar += 1;
        break;
      case 'em_analise':
      case 'reanalise':
      case 'aprovados':
      case 'negados':
        emAnalise += 1;
        break;
      case 'ass_app':
        assApp += 1;
        break;
      case 'finalizados':
        avaliadas += 1;
        break;
      case 'canceladas':
        canceladas += 1;
        break;
      default:
        break;
    }

    if (card.dueAt) {
      const dueDate = new Date(card.dueAt);
      if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() < nowTime) {
        atrasadas += 1;
      }
    }
  }

  return { avaliar, emAnalise, avaliadas, assApp, atrasadas, canceladas };
}
