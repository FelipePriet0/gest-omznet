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
    <div className="mb-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-end">
        <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <div className="relative max-w-[520px]">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar titular (nome da ficha)"
              className="pl-9 bg-[#018942]/10 text-white placeholder-white/80 placeholder:font-semibold border-2 border-white/80 focus:border-white w-full h-11 rounded-full outline-none"
              style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.2)" }}
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
              { value: "", label: "Todos", dotColor: "bg-zinc-400" },
              { value: "hoje", label: "Agendada para hoje", dotColor: "bg-blue-500" },
              { value: "amanha", label: "Agendada para amanhã", dotColor: "bg-amber-500" },
              { value: "atrasado", label: "Atrasado", dotColor: "bg-red-500" },
              { value: "data", label: "Escolher Data…", dotColor: "bg-violet-500" },
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
                className="bg-[#018942]/10 text-white border-2 border-white/80 focus:border-white w-full h-11 rounded-full outline-none px-3"
                style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.2)" }}
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

      <div className="mt-2 flex items-center justify-end">
        <button
          onClick={() => setOpenPersonType(true)}
          className="hover-scale group flex items-center gap-2 rounded-full bg-[#018942] px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[#017a3b]"
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
  options: { value: string; label: string; dotColor?: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => (value ?? "") === (o.value ?? "")) || (placeholder ? { value: "", label: placeholder } as any : options[0]);
  return (
    <div className="relative flex w-full flex-col gap-1">
      <label className="hidden text-xs font-medium text-white/90 sm:block">{label}</label>
      <label className="text-xs font-medium text-white/90 sm:hidden">{label.split(" ")[0]}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-full border-2 border-white/80 bg-[#018942]/10 px-4 text-left text-white"
        style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.2)" }}
      >
        <span className="flex items-center gap-3 truncate">
          {selected?.dotColor && <span className={`h-2.5 w-2.5 rounded-full ${selected.dotColor}`} />}
          <span className="truncate">{selected?.label}</span>
        </span>
        <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/5">
          <ul className="max-h-64 overflow-auto py-1">
            {(placeholder && !options.find(o=>o.value==="") ? [{ value: "", label: placeholder, dotColor: "bg-zinc-400" as const }, ...options] : options).map((o) => {
              const active = (value ?? "") === (o.value ?? "");
              return (
                <li key={`${o.value}|${o.label}`}>
                  <button
                    type="button"
                    onClick={() => { onChange?.(o.value); setOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-zinc-50 ${active ? "text-emerald-700" : "text-zinc-800"}`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      {o.dotColor && <span className={`h-2.5 w-2.5 rounded-full ${o.dotColor}`} />}
                      <span className="truncate">{o.label}</span>
                    </span>
                    {active && (
                      <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.01 7.01a1 1 0 01-1.42 0L3.296 9.742a1 1 0 111.414-1.414l3.14 3.139 6.303-6.3a1 1 0 011.55.123z" clipRule="evenodd"/></svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  );
}
