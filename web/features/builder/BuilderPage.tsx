"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AddTechnicianModal, type TechnicianCreateValue } from "@/features/builder/AddTechnicianModal";
import { formatDateLabel } from "@/lib/datetime";

type TabKey = "workflows" | "tecnicos";

function TabsToolbar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const item = (key: TabKey, label: string) => {
    const isActive = tab === key;
    return (
      <button
        type="button"
        onClick={() => onChange(key)}
        className={`min-w-[160px] rounded-[6px] px-5 py-2 text-sm font-semibold transition shadow-sm border ${
          isActive
            ? "bg-[var(--verde-primario)] text-white border-white/20"
            : "bg-white text-black/80 border-black/10 hover:bg-white/90"
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex items-center justify-center gap-2">
      {item("workflows", "Workflows")}
      {item("tecnicos", "Técnicos")}
    </div>
  );
}

function WorkflowsTab() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-base font-bold text-[var(--verde-primario)]">Crie o seu Workflow</div>
        <div className="text-xs text-[var(--verde-primario)]">Desenhe o Workflow da equipe de instalação Mznet</div>
      </div>
      <button
        type="button"
        className="btn-primary-mznet"
        onClick={() => {
          try { window.location.href = "/builder/canvas"; } catch {}
        }}
      >
        Criar Workflow
      </button>
      <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-5 w-full max-w-6xl">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="rounded-2xl bg-white/10 border border-white/20 p-4 text-white/80 shadow-sm">
            <div className="text-sm font-semibold text-white/90">Workflow {i}</div>
            <div className="mt-6 h-16 rounded-xl bg-black/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TechniciansTab() {
  const [open, setOpen] = useState(false);
  const [technicians, setTechnicians] = useState<
    Array<{
      id: string;
      name: string;
      activity?: string;
      deadline?: TechnicianCreateValue["deadline"];
      status?: TechnicianCreateValue["status"];
    }>
  >([
    { id: "seed-1", name: "Leandro Arruda", activity: "Instalação", status: "Pendente" },
    { id: "seed-2", name: "Alessandro", activity: "Manutenção", status: "Pendente" },
  ]);

  const addTechnician = (value: TechnicianCreateValue) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    setTechnicians((prev) => [
      { id, name: value.name, activity: value.activity, deadline: value.deadline, status: value.status },
      ...prev,
    ]);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-base font-bold text-[var(--verde-primario)]">Gerencie os técnicos Mznet</div>
        <div className="text-xs text-[var(--verde-primario)]">Crie e gerencie os técnicos da equipe de instalação Mznet</div>
      </div>
      <button type="button" className="btn-primary-mznet" onClick={() => setOpen(true)}>
        Adicionar Técnico
      </button>

      <AddTechnicianModal open={open} onOpenChange={setOpen} onSave={addTechnician} />

      <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-3 w-full max-w-4xl">
        {technicians.map((t) => (
          <div key={t.id} className="rounded-2xl bg-white/10 border border-white/20 p-4 text-white/90 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold">{t.name}</div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-600/15 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                {t.status || "Pendente"}
              </span>
            </div>

            <div className="mt-2 text-xs text-white/70">
              <span className="font-semibold text-white/80">Atividade:</span> {t.activity || "—"}
            </div>
            {t.deadline?.start && t.deadline?.end ? (
              <div className="mt-1 text-[11px] text-white/60">
                <span className="font-semibold text-white/70">Prazo:</span> {formatDateLabel(t.deadline.start)} – {formatDateLabel(t.deadline.end)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BuilderPage() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = (search?.get("tab") as TabKey) || "workflows";
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const current = (search?.get("tab") as TabKey) || "workflows";
    if (current !== tab) setTab(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onChange = (t: TabKey) => {
    setTab(t);
    try {
      const url = `${pathname}?tab=${t}`;
      router.replace(url);
    } catch {}
  };

  return (
    <div className="p-4 flex flex-col gap-6">
      <TabsToolbar tab={tab} onChange={onChange} />
      {tab === "workflows" ? <WorkflowsTab /> : <TechniciansTab />}
    </div>
  );
}
