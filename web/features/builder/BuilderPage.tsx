"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-base font-bold text-[var(--verde-primario)]">Gerencie os técnicos Mznet</div>
        <div className="text-xs text-[var(--verde-primario)]">Crie e gerencie os técnicos da equipe de instalação Mznet</div>
      </div>
      <button type="button" className="btn-primary-mznet">Adicionar Técnico</button>
      <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-3 w-full max-w-4xl">
        {["Leandro Arruda", "Alessandro"].map((name) => (
          <div key={name} className="rounded-2xl bg-white/10 border border-white/20 p-4 text-white/90 shadow-sm">
            <div className="text-sm font-semibold">{name}</div>
            <div className="mt-4 h-10 rounded-lg bg-black/20" />
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
