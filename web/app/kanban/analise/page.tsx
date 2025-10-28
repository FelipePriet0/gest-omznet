"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FilterBar } from "@/features/kanban/components/FilterBar";
import { KanbanBoardAnalise } from "@/features/kanban/components/KanbanBoardAnalise";

export default function KanbanAnalisePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) return <div className="text-sm text-zinc-600">Carregando…</div>;

  return (
    <div className="bg-[#ECF4FA] -mx-6 -my-6 min-h-[calc(100dvh-56px)] px-6 py-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">Kanban Análise</h1>
        </div>
        <FilterBar />
        <KanbanBoardAnalise />
      </div>
    </div>
  );
}
