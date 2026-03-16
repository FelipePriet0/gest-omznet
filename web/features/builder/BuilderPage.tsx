"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { listWorkflows, saveWorkflow, publishWorkflow, duplicateWorkflow, type BuilderWorkflow } from "@/features/builder/services";

import { AddTechnicianModal, type TechnicianCreateValue } from "@/features/builder/AddTechnicianModal";
import { Pointer } from "@/registry/magicui/pointer";
import { formatDateLabel } from "@/lib/datetime";
import { listTechnicians as listTechRows, createTechnician } from "@/features/technicians/services";

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
  const router = useRouter();
  const [items, setItems] = useState<BuilderWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try { setItems(await listWorkflows()); } finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const create = async () => {
    setSavingId("new");
    try {
      const minimal = { mode: "cursor", viewport: { x: 0, y: 0 }, nodes: [], edges: [], selectedNodeId: null };
      const wf = await saveWorkflow({ state: minimal, name: "Novo Workflow" });
      router.replace(`/builder/canvas?id=${wf.id}`);
    } finally {
      setSavingId(null);
    }
  };

  const togglePublish = async (wf: BuilderWorkflow) => {
    setSavingId(wf.id);
    try {
      await publishWorkflow(wf.id, !wf.published_at);
      await reload();
    } finally {
      setSavingId(null);
    }
  };

  const duplicate = async (wf: BuilderWorkflow) => {
    setSavingId(wf.id);
    try {
      const id = await duplicateWorkflow(wf.id);
      router.replace(`/builder/canvas?id=${id}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <div className="text-base font-bold text-[var(--verde-primario)]">Crie o seu Workflow</div>
        <div className="text-xs text-[var(--verde-primario)]">Desenhe o Workflow da equipe de instalação Mznet</div>
      </div>
      {/* Emoji pointer guidance area */}
      <div className="border-border rounded-lg border bg-white/60 backdrop-blur p-4 w-full max-w-3xl">
        <div className="relative h-28 w-full">
          <Pointer>
            <div className="text-2xl">👆</div>
          </Pointer>
        </div>
      </div>
      <button type="button" className="btn-primary-mznet" onClick={create} disabled={savingId === 'new'}>
        {savingId === 'new' ? 'Criando…' : 'Criar Workflow'}
      </button>

      <div className="mt-2 w-full max-w-6xl">
        {loading ? (
          <div className="text-sm text-white/80">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-white/60">Nenhum workflow ainda.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {items.map((wf) => (
              <div key={wf.id} className="rounded-2xl bg-white/10 border border-white/20 p-4 text-white/90 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold truncate" title={wf.name}>{wf.name}</div>
                  {wf.published_at && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-600/15 px-2 py-1 text-[11px] font-semibold text-emerald-100">Publicado</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <button type="button" className="btn-small-secondary" onClick={() => router.push(`/builder/canvas?id=${wf.id}`)}>Abrir</button>
                  <button type="button" className="btn-small-secondary" onClick={() => duplicate(wf)} disabled={savingId === wf.id}>Duplicar</button>
                  <button type="button" className="btn-small-secondary" onClick={() => togglePublish(wf)} disabled={savingId === wf.id}>
                    {wf.published_at ? 'Despublicar' : 'Publicar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TechniciansTab() {
  const [open, setOpen] = useState(false);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string; activity?: string; deadline?: TechnicianCreateValue["deadline"]; status?: TechnicianCreateValue["status"] }>>([]);
  const [canManage, setCanManage] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function reload() {
    const rows = await listTechRows(true);
    setTechnicians(rows.map((r) => ({ id: r.id, name: r.name, activity: r.activity || undefined })));
  }
  useEffect(() => {
    reload().catch(() => {});
    // Gate by role via RPC is_installer (gestores de rota/instalação/instalador/gestor)
    (async () => {
      try {
        const { data } = await (await import("@/lib/supabaseClient")).supabase.rpc('is_installer');
        setCanManage(Boolean(data));
      } catch {
        setCanManage(true); // fail-open for now
      }
    })();
  }, []);

  const addTechnician = async (value: TechnicianCreateValue) => {
    setErrorMsg(null);
    try {
      const start = (value.deadline?.start as any) || null;
      const end = (value.deadline?.end as any) || null;
      await createTechnician({ name: value.name, activity: value.activity, start, end });
      await reload();
    } catch (e: any) {
      const msg = e?.message || 'Sem permissão para criar técnico (role).';
      setErrorMsg(msg);
      alert(msg);
      throw e;
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-base font-bold text-[var(--verde-primario)]">Gerencie os técnicos Mznet</div>
        <div className="text-xs text-[var(--verde-primario)]">Crie e gerencie os técnicos da equipe de instalação Mznet</div>
      </div>
      <button type="button" className="btn-primary-mznet" onClick={() => setOpen(true)} disabled={!canManage}>
        Adicionar Técnico
      </button>
      {!canManage && (
        <div className="text-[13px] text-white/70">Apenas gestores de rota (role Instalação) podem criar técnicos.</div>
      )}

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
