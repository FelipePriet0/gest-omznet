"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PersonTypeModal } from "@/features/cadastro/components/PersonTypeModal";
import { BasicInfoModal } from "@/features/cadastro/components/BasicInfoModal";
import type { PessoaTipo } from "@/features/cadastro/types";

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState("");
  const setor = useMemo(() => (pathname?.includes("analise") ? "analise" : "comercial"), [pathname]);
  const [responsaveis, setResponsaveis] = useState<{ value: string; label: string }[]>([]);
  const [horaSel, setHoraSel] = useState<string>("");
  const [prazoSel, setPrazoSel] = useState<string>("");
  const [dataSel, setDataSel] = useState<string>("");
  // Cadastro modals
  const [openPersonType, setOpenPersonType] = useState(false);
  const [openBasicInfo, setOpenBasicInfo] = useState(false);
  const [tipoSel, setTipoSel] = useState<PessoaTipo | null>(null);

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

  // Horários fixos conforme especificação
  const horarios = [
    { value: "08:30", label: "08:30" },
    { value: "10:30", label: "10:30" },
    { value: "13:30", label: "13:30" },
    { value: "15:30", label: "15:30" },
  ];

  useEffect(() => {
    // sincroniza valor inicial do ?hora com o select
    try {
      const v = searchParams.get("hora") || "";
      setHoraSel(v);
      const p = searchParams.get("prazo") || "";
      setPrazoSel(p);
      const d = searchParams.get("data") || "";
      setDataSel(d);
    } catch {}
  }, [searchParams, pathname]);

  function onChangeHora(v: string) {
    setHoraSel(v);
    try {
      const params = new URLSearchParams(searchParams?.toString());
      if (v) params.set("hora", v); else params.delete("hora");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    } catch {}
  }

  function onChangePrazo(v: string) {
    setPrazoSel(v);
    const params = new URLSearchParams(searchParams?.toString());
    if (v) params.set('prazo', v); else { params.delete('prazo'); params.delete('data'); setDataSel(''); }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function onChangeData(v: string) {
    setDataSel(v);
    const params = new URLSearchParams(searchParams?.toString());
    if (v) { params.set('prazo','data'); params.set('data', v); } else { params.delete('data'); }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-[#018942] via-[#016b35] to-[#014d28] p-6 text-white shadow-xl">
      <div className="pointer-events-none absolute inset-0 opacity-10" />
      <div className="relative grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-end">
        <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar titular (nome da ficha)"
              className="pl-9 bg-white/10 backdrop-blur-sm text-white placeholder-white/70 border-white/20 focus:border-white/40 focus:bg-white/20 w-full h-11 rounded-full outline-none"
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
          <Select label="👤 Resp." placeholder="Todos" options={responsaveis} />
        </div>

        <div className="flex items-end gap-3">
          <Select
            label="📅 Prazo"
            placeholder="Todos"
            options={[
              { value: "hoje", label: "Agendada para hoje" },
              { value: "amanha", label: "Agendada para amanhã" },
              { value: "atrasado", label: "Atrasado" },
              { value: "data", label: "Escolher data" },
            ]}
            value={prazoSel}
            onChange={onChangePrazo}
          />
          {prazoSel === 'data' && (
            <div className="flex flex-col">
              <label className="text-xs font-medium text-white/90">Data</label>
              <input
                type="date"
                value={dataSel}
                onChange={(e)=> onChangeData(e.target.value)}
                className="bg-white/10 backdrop-blur-sm text-white border-white/20 focus:border-white/40 focus:bg-white/20 w-full h-11 rounded-full outline-none px-3"
              />
            </div>
          )}
        </div>

        <div className="flex items-end">
          <Select label="🕒 Horário" placeholder="Todos" options={horarios} value={horaSel} onChange={onChangeHora} />
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

      <div className="mt-6 flex items-center justify-end">
        <button
          onClick={() => setOpenPersonType(true)}
          className="hover-scale group flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/30"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Nova ficha</span>
          <span className="sm:hidden">Nova</span>
        </button>
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
    <div className="flex w-full flex-col gap-1">
      <label className="hidden text-xs font-medium text-white/90 sm:block">{label}</label>
      <label className="text-xs font-medium text-white/90 sm:hidden">{label.split(" ")[0]}</label>
      <select
        className="bg-white/10 backdrop-blur-sm text-white border-white/20 focus:border-white/40 focus:bg-white/20 w-full h-11 rounded-full outline-none px-3"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-gray-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
