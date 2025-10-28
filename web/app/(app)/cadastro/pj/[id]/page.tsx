"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CadastroPJPage() {
  const params = useParams();
  const id = params?.id as string;
  const [nome, setNome] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: app } = await supabase.from("applicants").select("primary_name").eq("id", id).single();
        if (!active) return;
        setNome(app?.primary_name ?? "");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="p-4 text-sm text-zinc-600">Carregando…</div>;
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Expanded PJ (stub)</h1>
      <p className="mt-2 text-sm text-zinc-700">Applicant: {nome || id}</p>
      <p className="mt-2 text-xs text-zinc-600">Em breve: formulário completo com auto‑save.</p>
    </div>
  );
}

