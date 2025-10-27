"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const setor = useMemo(() => (pathname?.includes("analise") ? "analise" : "comercial"), [pathname]);
  const [responsaveis, setResponsaveis] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const area = setor === "analise" ? "analise" : "comercial";
      const { data, error } = await supabase.rpc("list_responsaveis", { p_area: area });
      if (!active) return;
      if (error) {
        console.error(error);
        setResponsaveis([]);
      } else {
        setResponsaveis(
          (data as any[] | null)?.map((r) => ({ value: r.id as string, label: r.full_name as string })) ?? []
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [setor]);

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#018942] to-[#014d28] p-3 sm:p-4 shadow-lg">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar Titular (Nome da ficha)"
              className="w-full rounded-full border-0 bg-white/90 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none focus:bg-white focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>

        <div className="flex items-end">
          <Select
            label="📍 Área"
            value={setor}
            onChange={(v) => router.push(v === "analise" ? "/kanban/analise" : "/kanban")}
            options={[
              { value: "comercial", label: "Comercial" },
              { value: "analise", label: "Análise" },
            ]}
          />
        </div>

        <div className="flex items-end">
          <Select
            label="👤 Resp."
            placeholder="Todos"
            options={responsaveis}
          />
        </div>

        <div className="flex items-end">
          <Select
            label="📅 Prazo"
            placeholder="Todos"
            options={[
              { value: "hoje", label: "Agendada para hoje" },
              { value: "amanha", label: "Agendada para amanhã" },
              { value: "atrasado", label: "Atrasado" },
              { value: "data", label: "Escolher data" },
            ]}
          />
        </div>

        <div className="flex items-end">
          <Select
            label="🎯 Atribuídas"
            placeholder="Todos"
            options={[
              { value: "minhas-mencoes", label: "Minhas Menções" },
              { value: "minhas-tarefas", label: "Minhas Tarefas" },
            ]}
          />
        </div>
      </div>
      
      <div className="mt-4 flex justify-center sm:justify-end">
        <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#018942] shadow-md transition-all hover:scale-105 hover:shadow-lg sm:px-6">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Nova Ficha</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-xs font-medium text-white/90 hidden sm:block">{label}</label>
      <label className="text-xs font-medium text-white/90 sm:hidden">{label.split(' ')[0]}</label>
      <select
        className="rounded-full border-0 bg-white/90 px-3 py-2 text-sm text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-white/50 w-full"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
