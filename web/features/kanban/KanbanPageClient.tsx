"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, FileCheck, XCircle, CheckCircle, Clock } from "lucide-react";
import { useState as useModalState } from "react";
import { FilterCTA, AppliedFilters } from "@/components/app/filter-cta";
import { Button } from "@/components/ui/button";
import { PersonTypeModal } from "@/legacy/components/cadastro/components/PersonTypeModal";
import { BasicInfoModal } from "@/legacy/components/cadastro/components/BasicInfoModal";
import { KanbanBoard } from "@/legacy/components/kanban/components/KanbanBoard";
import type { PessoaTipo } from "@/features/cadastro/types";
import { supabase, clearStaleSupabaseSession } from "@/lib/supabaseClient";
import { listMyMentionCardIds } from "@/features/inbox/services";
import { KanbanCard } from "@/features/kanban/types";

export default function KanbanPageClient() {
  const searchKey = useSearchParams().toString();

  return (
    <Suspense fallback={<div className="text-sm text-zinc-600">Carregando…</div>}>
      <KanbanPageInner key={searchKey} />
    </Suspense>
  );
}

function KanbanPageInner() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const hora = sp.get("hora") || undefined;
  const prazo = sp.get("prazo") || undefined;
  const prazoFim = sp.get("prazo_fim") || undefined;
  const responsavelParam = sp.get("responsavel") || "";
  const busca = sp.get("busca") || undefined;
  const responsaveis = useMemo(() => {
    if (!responsavelParam) return [] as string[];
    return Array.from(
      new Set(
        responsavelParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    );
  }, [responsavelParam]);
  const openCardId = sp.get("card") || undefined;
  const initialFiltersSummary = useMemo<AppliedFilters>(
    () => ({
      responsaveis,
      prazo: prazo ? { start: prazo, end: prazoFim || undefined } : undefined,
      hora: hora || undefined,
      myMentions: sp.get("minhas_mencoes") === "1",
      searchTerm: busca || undefined,
    }),
    [responsaveis, prazo, prazoFim, hora, busca, sp],
  );
  const [filtersSummary, setFiltersSummary] = useState<AppliedFilters>(
    initialFiltersSummary,
  );
  const [cardsSnapshot, setCardsSnapshot] = useState<KanbanCard[]>([]);
  const [mentionCardIds, setMentionCardIds] = useState<string[] | null>(null);
  const [openPersonType, setOpenPersonType] = useModalState(false);
  const [openBasicInfo, setOpenBasicInfo] = useModalState(false);
  const [tipoSel, setTipoSel] = useModalState<PessoaTipo | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const bottomInnerRef = useRef<HTMLDivElement | null>(null);

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
    return () => {
      active = false;
    };
  }, [filtersSummary.myMentions]);

  const handleCardModalClose = useCallback(() => {
    const params = new URLSearchParams(sp.toString());
    if (!params.has("card")) return;
    params.delete("card");
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }, [router, pathname, sp]);

  const dashboard = useMemo(
    () => computeCommercialDashboard(cardsSnapshot),
    [cardsSnapshot],
  );

  useEffect(() => {
    const main = document.querySelector(
      '[data-kanban-hscroll="comercial"]',
    ) as HTMLDivElement | null;
    const content = document.querySelector(
      '[data-kanban-content="comercial"]',
    ) as HTMLDivElement | null;
    const proxy = bottomRef.current;
    const proxyInner = bottomInnerRef.current;
    if (!main || !content || !proxy || !proxyInner) return;

    const resizeObserver = new ResizeObserver(() => {
      try {
        proxyInner.style.width = `${content.scrollWidth}px`;
      } catch {}
    });
    resizeObserver.observe(content);

    let syncing: "main" | "proxy" | null = null;
    const onMain = () => {
      if (syncing === "proxy") return;
      syncing = "main";
      proxy.scrollLeft = main.scrollLeft;
      syncing = null;
    };
    const onProxy = () => {
      if (syncing === "main") return;
      syncing = "proxy";
      main.scrollLeft = proxy.scrollLeft;
      syncing = null;
    };

    main.addEventListener("scroll", onMain, { passive: true });
    proxy.addEventListener("scroll", onProxy, { passive: true });
    try {
      proxyInner.style.width = `${content.scrollWidth}px`;
    } catch {}
    proxy.scrollLeft = main.scrollLeft;
    return () => {
      try {
        resizeObserver.disconnect();
      } catch {}
      main.removeEventListener("scroll", onMain);
      proxy.removeEventListener("scroll", onProxy);
    };
  }, [cardsSnapshot]);

  if (loading) {
    return <div className="text-sm text-zinc-600">Carregando…</div>;
  }

  return (
    <div id="kanban-page-root" className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overscroll-contain">
        <div className="border-b border-white/40 bg-[var(--neutro)] px-3 pb-4 pt-3 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterCTA area="comercial" onFiltersChange={handleFiltersChange} />
            <Button
              onClick={() => setOpenPersonType(true)}
              className="h-9 shrink-0 bg-emerald-600 text-sm text-white hover:bg-emerald-700"
              style={{
                paddingLeft: "18px",
                paddingRight: "18px",
                borderRadius: "10px",
              }}
            >
              <Plus className="mr-2 size-6" />
              Nova ficha
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4 md:gap-6">
            <DashboardCard
              title="Fichas feitas"
              value={dashboard.feitasAguardando}
              icon={<FileCheck className="h-4 w-4 text-white" />}
            />
            <DashboardCard
              title="Canceladas"
              value={dashboard.canceladas}
              icon={<XCircle className="h-4 w-4 text-white" />}
            />
            <DashboardCard
              title="Concluídas"
              value={dashboard.concluidas}
              icon={<CheckCircle className="h-4 w-4 text-white" />}
            />
            <DashboardCard
              title="Atrasadas"
              value={dashboard.atrasadas}
              icon={<Clock className="h-4 w-4 text-white" />}
            />
          </div>
        </div>
        <div
          className="relative flex min-h-0 flex-1 px-1 pb-6 pt-4 md:px-3"
          aria-label="Kanban content"
          data-kanban-vscroll
        >
          <KanbanBoard
            hora={filtersSummary.hora}
            dateStart={filtersSummary.prazo?.start}
            dateEnd={filtersSummary.prazo?.end}
            openCardId={openCardId}
            responsaveis={
              filtersSummary.responsaveis.length > 0
                ? filtersSummary.responsaveis
                : undefined
            }
            searchTerm={filtersSummary.searchTerm}
            allowedCardIds={mentionCardIds ?? undefined}
            onCardsChange={setCardsSnapshot}
            onCardModalClose={handleCardModalClose}
          />
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--neutro)]/90"
        style={{ height: 14 }}
      >
        <div ref={bottomRef} className="h-full overflow-x-auto overflow-y-hidden">
          <div ref={bottomInnerRef} style={{ height: 1 }} />
        </div>
      </div>

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
  );
}

function DashboardCard({
  title,
  value,
  icon,
}: {
  title: string;
  value?: number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex h-[120px] w-full flex-col overflow-hidden rounded-[12px] border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-[#000000] px-4 py-3">
        <div className="text-sm font-medium text-white">{title}</div>
        {icon && <div className="text-white">{icon}</div>}
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-3xl font-bold text-[var(--verde-primario)]">
          {typeof value === "number" ? value : "—"}
        </div>
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
        if (
          !Number.isNaN(dueDate.getTime()) &&
          dueDate.getTime() < now.getTime()
        ) {
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
