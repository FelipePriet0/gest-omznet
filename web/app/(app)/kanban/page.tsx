"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/features/kanban/components/KanbanBoard";
import { supabase } from "@/lib/supabaseClient";

export default function KanbanPage() {
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

  if (loading) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-400">Carregando…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kanban</h1>
        <div className="rounded-md border border-zinc-200 p-1 text-xs dark:border-zinc-800">
          <span className="rounded bg-zinc-900 px-2 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Análise</span>
        </div>
      </div>
      <KanbanBoard />
    </div>
  );
}
