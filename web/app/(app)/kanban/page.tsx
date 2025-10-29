"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KanbanBoard } from "@/features/kanban/components/KanbanBoard";
import { FilterBar } from "@/features/kanban/components/FilterBar";
import { supabase, clearStaleSupabaseSession } from "@/lib/supabaseClient";

export default function KanbanPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sp = useSearchParams();
  const hora = sp.get("hora") || undefined;
  const prazo = (sp.get("prazo") as any) || undefined;
  const date = sp.get("data") || undefined;
  const openCardId = sp.get("card") || undefined;

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
    <div className="bg-[#ECF4FA] -mx-4 sm:-mx-6 -my-4 sm:-my-6 min-h-[calc(100dvh-56px)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kanban Comercial</h1>
        </div>
        <FilterBar />
        <KanbanBoard hora={hora as any} prazo={prazo} date={date} openCardId={openCardId} />
      </div>
    </div>
  );
}
