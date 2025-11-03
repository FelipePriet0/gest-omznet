"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KanbanBoard } from "@/legacy/components/kanban/components/KanbanBoard";
import { FilterCTA } from "@/components/app/filter-cta";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState as useModalState } from "react";
import { PersonTypeModal } from "@/legacy/components/cadastro/components/PersonTypeModal";
import { BasicInfoModal } from "@/legacy/components/cadastro/components/BasicInfoModal";
import type { PessoaTipo } from "@/features/cadastro/types";
import { supabase, clearStaleSupabaseSession } from "@/lib/supabaseClient";
import { getKanbanDashboard, KanbanDashboard } from "@/features/kanban/services";

export default function KanbanPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sp = useSearchParams();
  const hora = sp.get("hora") || undefined;
  const prazo = (sp.get("prazo") as any) || undefined;
  const date = sp.get("data") || undefined;
  const openCardId = sp.get("card") || undefined;
  const [dash, setDash] = useState<KanbanDashboard | null>(null);
  
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
        // Carrega dashboard Comercial (backend-first)
        try {
          const d = await getKanbanDashboard('comercial');
          if (mounted) setDash(d);
        } catch (e) {
          console.error('Falha ao carregar dashboard_kanban_counts(comercial):', e);
        }
      } catch {
        clearStaleSupabaseSession();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return <div className="text-sm text-zinc-600">Carregando…</div>;
  }

  return (
    <>
      <div className="relative">
        <div className="absolute top-0 left-0 z-10">
          <FilterCTA />
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
          {/* Cards de dashboard (placeholder) */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4 md:gap-6 w-full">
            <DashboardCard title="Fichas feitas" value={dash?.feitasAguardando} />
            <DashboardCard title="Canceladas" value={dash?.canceladas} />
            <DashboardCard title="Concluídas" value={dash?.concluidas} />
            <DashboardCard title="Atrasadas" value={dash?.atrasadas} highlight />
          </div>
          {/* Espaçamento igual ao usado entre filtros/CTA e colunas */}
          <div className="mt-12">
            <KanbanBoard hora={hora as any} prazo={prazo} date={date} openCardId={openCardId} />
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

function DashboardCard({ title, value, highlight }: { title: string; value?: number | null; highlight?: boolean }) {
  return (
    <div className={["h-[200px] w-full rounded-[12px] border shadow-sm p-4 flex flex-col justify-between",
      highlight ? "bg-red-50 border-red-200" : "bg-white border-zinc-200"].join(" ")}
    >
      <div className="text-sm text-zinc-600">{title}</div>
      <div className="text-4xl font-bold text-zinc-900">{typeof value === 'number' ? value : '—'}</div>
    </div>
  );
}
