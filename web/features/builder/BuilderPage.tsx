"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Trash2, MoreHorizontal } from "lucide-react";
import {
  listWorkflows, saveWorkflow, duplicateWorkflow, toggleWorkflowActive, deleteWorkflow,
  type BuilderWorkflow,
} from "@/features/builder/services";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddTechnicianModal, type TechnicianCreateValue } from "@/features/builder/AddTechnicianModal";
import { EditTechnicianModal } from "@/features/builder/EditTechnicianModal";
import { formatDateLabel } from "@/lib/datetime";
import {
  listTechnicians as listTechRows, createTechnician,
  toggleTechnicianActive, deleteTechnician, updateTechnicianInfo,
  type TechnicianRow,
} from "@/features/technicians/services";
import { cn } from "@/lib/utils";

// ── Toggle Switch simples (sem dependência externa) ────────────────────────
function Switch({
  checked,
  onCheckedChange,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none disabled:opacity-40",
        checked ? "bg-emerald-500" : "bg-zinc-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

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

// ── Workflows Tab ──────────────────────────────────────────────────────────
function WorkflowsTab() {
  const router = useRouter();
  const [items, setItems] = useState<BuilderWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BuilderWorkflow | null>(null);

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
    } finally { setSavingId(null); }
  };

  const handleToggleActive = async (wf: BuilderWorkflow, active: boolean) => {
    setSavingId(wf.id);
    try {
      await toggleWorkflowActive(wf.id, active);
      setItems((prev) => prev.map((w) => w.id === wf.id ? { ...w, active } : w));
    } catch (e: any) { alert(e?.message || "Erro ao alterar status."); }
    finally { setSavingId(null); }
  };

  const handleDuplicate = async (wf: BuilderWorkflow) => {
    setSavingId(wf.id);
    try {
      const id = await duplicateWorkflow(wf.id);
      router.replace(`/builder/canvas?id=${id}`);
    } finally { setSavingId(null); }
  };

  const handleDelete = async (wf: BuilderWorkflow) => {
    setSavingId(wf.id);
    try {
      await deleteWorkflow(wf.id);
      setItems((prev) => prev.filter((w) => w.id !== wf.id));
    } catch (e: any) { alert(e?.message || "Erro ao excluir."); }
    finally { setSavingId(null); setConfirmDelete(null); }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <div className="text-base font-bold text-[var(--verde-primario)]">Crie o seu Workflow</div>
        <div className="text-xs text-[var(--verde-primario)]">Desenhe o Workflow da equipe de instalação Mznet</div>
      </div>
      <button type="button" className="btn-primary-mznet" onClick={create} disabled={savingId === "new"}>
        {savingId === "new" ? "Criando…" : "Criar Workflow"}
      </button>

      <div className="mt-2 w-full max-w-6xl">
        {loading ? (
          <div className="text-sm text-zinc-500">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-zinc-400">Nenhum workflow ainda.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {items.map((wf) => (
              <div
                key={wf.id}
                className={cn(
                  "relative rounded-2xl border p-4 shadow-sm flex flex-col gap-3 cursor-pointer transition hover:shadow-md select-none",
                  wf.active
                    ? "bg-white border-emerald-500/40 text-zinc-900"
                    : "bg-white border-zinc-200 text-zinc-500",
                )}
                onClick={() => router.push(`/builder/canvas?id=${wf.id}`)}
              >
                {/* Cabeçalho: nome + toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-semibold truncate leading-snug" title={wf.name}>
                      {wf.name}
                    </span>
                    {wf.published_at && (
                      <span className="w-fit rounded-full border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Publicado
                      </span>
                    )}
                  </div>
                  {/* Toggle On/Off — stopPropagation para não abrir o canvas */}
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Switch
                      checked={wf.active}
                      onCheckedChange={(v) => handleToggleActive(wf, v)}
                      disabled={savingId === wf.id}
                    />
                  </div>
                </div>

                {/* Rodapé: label status + 3 pontinhos */}
                <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <span className={cn(
                    "text-[11px] font-medium",
                    wf.active ? "text-emerald-600" : "text-zinc-400",
                  )}>
                    {wf.active ? "Ativo" : "Inativo"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-zinc-100 transition"
                        aria-label="Opções do workflow"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px] bg-white border border-zinc-200 shadow-lg">
                      <DropdownMenuItem onClick={() => handleDuplicate(wf)}>
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={() => setConfirmDelete(wf)}
                      >
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmação de exclusão de workflow */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-sm font-semibold text-zinc-800 mb-1">Excluir workflow?</p>
            <p className="text-xs text-zinc-500 mb-5">
              O workflow <strong>"{confirmDelete.name}"</strong> será removido permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-small-secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition"
                onClick={() => handleDelete(confirmDelete)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Technicians Tab ────────────────────────────────────────────────────────
function TechniciansTab() {
  const [openAdd, setOpenAdd] = useState(false);
  const [editTech, setEditTech] = useState<TechnicianRow | null>(null);
  const [confirmDeleteTech, setConfirmDeleteTech] = useState<TechnicianRow | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianRow[]>([]);
  const [canManage, setCanManage] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function reload() {
    // Carrega todos (ativos e inativos) para mostrar na lista do builder
    const rows = await listTechRows(false);
    setTechnicians(rows);
  }

  useEffect(() => {
    reload().catch(() => {});
    (async () => {
      try {
        const { data } = await (await import("@/lib/supabaseClient")).supabase.rpc("is_installer");
        setCanManage(Boolean(data));
      } catch { setCanManage(true); }
    })();
  }, []);

  const handleAddTechnician = async (value: TechnicianCreateValue) => {
    try {
      const start = (value.deadline?.start as any) || null;
      const end = (value.deadline?.end as any) || null;
      await createTechnician({ name: value.name, activity: value.activity, start, end });
      await reload();
    } catch (e: any) {
      const msg = e?.message || "Sem permissão para criar técnico (role).";
      alert(msg);
      throw e;
    }
  };

  const handleToggleActive = async (t: TechnicianRow, active: boolean) => {
    setSavingId(t.id);
    try {
      await toggleTechnicianActive(t.id, active);
      setTechnicians((prev) => prev.map((r) => r.id === t.id ? { ...r, active } : r));
    } catch (e: any) { alert(e?.message || "Erro ao alterar status."); }
    finally { setSavingId(null); }
  };

  const handleEdit = async (id: string, data: { name: string; activity: string | null; start: string | null; end: string | null }) => {
    await updateTechnicianInfo({ id, name: data.name, activity: data.activity, start: data.start, end: data.end });
    await reload();
  };

  const handleDelete = async (t: TechnicianRow) => {
    setSavingId(t.id);
    try {
      await deleteTechnician(t.id);
      setTechnicians((prev) => prev.filter((r) => r.id !== t.id));
    } catch (e: any) { alert(e?.message || "Erro ao excluir."); }
    finally { setSavingId(null); setConfirmDeleteTech(null); }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-base font-bold text-[var(--verde-primario)]">Gerencie os técnicos Mznet</div>
        <div className="text-xs text-[var(--verde-primario)]">Crie e gerencie os técnicos da equipe de instalação Mznet</div>
      </div>
      <button type="button" className="btn-primary-mznet" onClick={() => setOpenAdd(true)} disabled={!canManage}>
        Adicionar Técnico
      </button>
      {!canManage && (
        <div className="text-[13px] text-zinc-500">Apenas gestores de rota (role Instalação) podem criar técnicos.</div>
      )}

      <AddTechnicianModal open={openAdd} onOpenChange={setOpenAdd} onSave={handleAddTechnician} />
      <EditTechnicianModal
        open={!!editTech}
        technician={editTech}
        onOpenChange={(v) => { if (!v) setEditTech(null); }}
        onSave={handleEdit}
      />

      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3 w-full max-w-4xl">
        {technicians.map((t) => (
          <div
            key={t.id}
            className={cn(
              "relative rounded-2xl border p-4 shadow-sm flex flex-col gap-3 transition cursor-pointer",
              t.active
                ? "bg-white border-emerald-500/40 text-zinc-900"
                : "bg-white border-zinc-200 text-zinc-500",
            )}
            onClick={() => setEditTech(t)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditTech(t); } }}
            aria-label={`Abrir edição do técnico ${t.name}`}
          >
            {/* Linha 1: nome + toggle */}
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-snug truncate">{t.name}</div>
                <div className={cn("text-xs mt-0.5", t.active ? "text-zinc-500" : "text-zinc-400")}>
                  {t.activity || "—"}
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={t.active}
                  onCheckedChange={(v) => handleToggleActive(t, v)}
                  disabled={savingId === t.id}
                />
              </div>
            </div>

            {/* Linha 2: prazo (se definido) */}
            {t.available_start && t.available_end && (
              <div className={cn("text-[11px]", t.active ? "text-zinc-400" : "text-zinc-300")}>
                {formatDateLabel(t.available_start)} – {formatDateLabel(t.available_end)}
              </div>
            )}

            {/* Linha 3: status + 3 pontinhos */}
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[11px] font-medium",
                t.active ? "text-emerald-600" : "text-zinc-400",
              )}>
                {t.active ? "Ativo" : "Inativo"}
              </span>
              <button
                type="button"
                className="rounded-md p-2 hover:bg-red-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                aria-label={`Excluir técnico ${t.name}`}
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteTech(t); }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmação de exclusão de técnico */}
      {confirmDeleteTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-sm font-semibold text-zinc-800 mb-1">Excluir técnico?</p>
            <p className="text-xs text-zinc-500 mb-5">
              <strong>{confirmDeleteTech.name}</strong> será removido da equipe e não participará mais do matching.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-small-secondary" onClick={() => setConfirmDeleteTech(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition"
                onClick={() => handleDelete(confirmDeleteTech)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BuilderPage ────────────────────────────────────────────────────────────
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
    try { router.replace(`${pathname}?tab=${t}`); } catch {}
  };

  return (
    <div className="p-4 flex flex-col gap-6">
      <TabsToolbar tab={tab} onChange={onChange} />
      {tab === "workflows" ? <WorkflowsTab /> : <TechniciansTab />}
    </div>
  );
}
