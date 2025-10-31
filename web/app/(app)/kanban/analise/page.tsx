"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/legacy/components/kanban/components/FilterBar";
import { KanbanBoardAnalise } from "@/legacy/components/kanban/components/KanbanBoardAnalise";
import { supabase, clearStaleSupabaseSession } from "@/lib/supabaseClient";

export default function KanbanAnalisePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sp = useSearchParams();
  const hora = sp.get('hora') || undefined;
  const prazo = (sp.get('prazo') as any) || undefined;
  const date = sp.get('data') || undefined;
  const openCardId = sp.get('card') || undefined;

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

  if (loading) {
    return <div className="text-sm text-zinc-600">Carregando…</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kanban Análise</h1>
      </div>
      <FilterBar />
      <div className="mt-6">
        <KanbanBoardAnalise hora={hora as any} prazo={prazo} date={date} openCardId={openCardId} />
      </div>
    </>
  );
}
