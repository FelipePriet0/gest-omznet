"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Globe, GlobeLock } from "lucide-react";
import { useHistory } from "./useHistory";
import type { CanvasEdge, CanvasNode, CanvasNodeType, CanvasWorkflowState, PortId } from "./types";
import { CanvasDock } from "./components/CanvasDock";
import { getWorkflow, saveWorkflow, publishWorkflow } from "@/features/builder/services";
import { CanvasSurface } from "./components/CanvasSurface";
import { Inspector } from "./components/Inspector";
import { LeftPalette } from "./components/LeftPalette";

function uid(prefix: string) {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${base}`;
}

function estimatedNodeSize(type: CanvasNodeType) {
  if (type === "priority") return { w: 260, h: 190 };
  return { w: 260, h: 130 };
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findFreeSpot({
  nodes,
  viewport,
  type,
}: {
  nodes: CanvasNode[];
  viewport: CanvasWorkflowState["viewport"];
  type: CanvasNodeType;
}) {
  const { w, h } = estimatedNodeSize(type);
  const padding = 24;

  const taken = nodes.map((n) => {
    const size = estimatedNodeSize(n.type);
    return { x: n.x, y: n.y, w: size.w + padding, h: size.h + padding };
  });

  const baseX = 300 - viewport.x;
  const baseY = 160 - viewport.y;
  const stepX = 320;
  const stepY = 220;

  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 6; col++) {
      const candidate = { x: baseX + col * stepX, y: baseY + row * stepY, w, h };
      const collides = taken.some((r) => rectsOverlap(candidate, r));
      if (!collides) return { x: candidate.x, y: candidate.y };
    }
  }

  return { x: baseX, y: baseY };
}

function initialState(): CanvasWorkflowState {
  const nodes: CanvasNode[] = [
    { id: "n_start",      type: "start",      x: 140,  y: 225, data: {} },
    { id: "n_technician", type: "technician",  x: 420,  y: 220, data: { technicianIds: [] } },
    { id: "n_priority",   type: "priority",    x: 650,  y: 200, data: { priorities: ["", "", ""] } },
    { id: "n_route",      type: "route",       x: 890,  y: 235, data: { routes: [] } },
    { id: "n_finish",     type: "finish",      x: 1150, y: 225, data: {} },
  ];

  const edges: CanvasEdge[] = [
    { id: "e_1", from: { nodeId: "n_technician", port: "right" }, to: { nodeId: "n_priority", port: "left" } },
    { id: "e_2", from: { nodeId: "n_priority", port: "right" }, to: { nodeId: "n_route", port: "left" } },
  ];

  return {
    mode: "cursor",
    viewport: { x: 0, y: 0 },
    nodes,
    edges,
    selectedNodeId: null,
  };
}

// ── Validação de publicação ────────────────────────────────────────────────
function validateWorkflow(state: CanvasWorkflowState): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { nodes, edges } = state;

  const startNode  = nodes.find((n) => n.type === "start");
  const finishNode = nodes.find((n) => n.type === "finish");

  // 1. Start desconectado
  if (startNode && !edges.some((e) => e.from.nodeId === startNode.id || e.to.nodeId === startNode.id))
    errors.push("O card Início não está conectado a nenhum outro card.");

  // 2. Finish desconectado
  if (finishNode && !edges.some((e) => e.from.nodeId === finishNode.id || e.to.nodeId === finishNode.id))
    errors.push("O card Fim não está conectado a nenhum outro card.");

  // 3. Cards de Técnico sem técnico selecionado
  const emptyTechs = nodes.filter((n) => n.type === "technician" && (n.data as any).technicianIds?.length === 0);
  if (emptyTechs.length > 0)
    errors.push(`${emptyTechs.length} card(s) de Técnico sem nenhum técnico selecionado.`);

  // 4. Cards de Rota sem rota selecionada
  const emptyRoutes = nodes.filter((n) => n.type === "route" && (n.data as any).routes?.length === 0);
  if (emptyRoutes.length > 0)
    errors.push(`${emptyRoutes.length} card(s) de Rota sem nenhuma rota selecionada.`);

  // 5. Nós soltos (sem nenhuma conexão, exceto start/finish)
  const loose = nodes.filter(
    (n) =>
      n.type !== "start" &&
      n.type !== "finish" &&
      !edges.some((e) => e.from.nodeId === n.id || e.to.nodeId === n.id)
  );
  if (loose.length > 0)
    errors.push(`${loose.length} card(s) solto(s) sem nenhuma conexão no fluxo.`);

  // 6. Cards de Prioridade com todos os campos vazios (warning)
  const emptyPriorities = nodes.filter(
    (n) => n.type === "priority" && (n.data as any).priorities?.every((p: string) => !p?.trim())
  );
  if (emptyPriorities.length > 0)
    warnings.push(`${emptyPriorities.length} card(s) de Prioridade sem nenhuma prioridade definida.`);

  // 7. Nós sem saída que não são Finish (beco sem saída) (warning)
  const deadEnds = nodes.filter(
    (n) =>
      n.type !== "finish" &&
      n.type !== "start" &&
      !edges.some((e) => e.from.nodeId === n.id)
  );
  if (deadEnds.length > 0)
    warnings.push(`${deadEnds.length} card(s) sem saída — podem ser becos sem saída no fluxo.`);

  return { errors, warnings };
}

export function CanvasPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const wfId = sp?.get("id") || null;
  const [loaded, setLoaded] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(wfId);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState<string>("New Workflow");
  const [publishing, setPublishing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const history = useHistory<CanvasWorkflowState>(useMemo(() => initialState(), []), { max: 80 });
  const state = history.present;
  const savingRef = useRef(false);
  const clipboardNode = useRef<CanvasNode | null>(null);

  // Helper: robust error logger to avoid printing empty objects
  function logError(prefix: string, err: any) {
    try {
      const e: any = err;
      const base = {
        message: e?.message ?? undefined,
        code: e?.code ?? undefined,
        details: e?.details ?? undefined,
        hint: e?.hint ?? undefined,
        status: e?.status ?? undefined,
      } as Record<string, any>;
      // Also include own non-enumerable props from Error
      try {
        const own: Record<string, any> = {};
        for (const k of Object.getOwnPropertyNames(e || {})) {
          if (typeof own[k] === 'undefined') own[k] = e[k];
        }
        Object.assign(base, own);
      } catch {}
      const summary = (() => {
        try { return JSON.stringify(base, (_k, v) => (v instanceof Error ? (v.message || String(v)) : v)); } catch { return String(e); }
      })();
      console.error(`${prefix} ${summary}`);
    } catch {
      try { console.error(prefix, String(err)); } catch { console.error(prefix); }
    }
  }

  const selectedNode = state.selectedNodeId ? state.nodes.find((n) => n.id === state.selectedNodeId) ?? null : null;
  const routeRankForSelected = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'route') return null;
    let rank = 0;
    for (const n of state.nodes) {
      if (n.type === 'route') {
        rank += 1;
        if (n.id === selectedNode.id) return rank;
      }
    }
    return null;
  }, [selectedNode, state.nodes]);

  // Load workflow state when id is provided
  useEffect(() => {
    let active = true;
    (async () => {
      if (!wfId) { setLoaded(true); return; }
      try {
        const wf = await getWorkflow(wfId);
        if (!active) return;
        if (wf && wf.state) {
          // Initialize history with loaded state, injetando start/finish se ausentes
          history.setPresent(() => {
            const loaded = wf.state as CanvasWorkflowState;
            const nodes = loaded.nodes || [];
            const hasStart  = nodes.some((n) => n.type === "start");
            const hasFinish = nodes.some((n) => n.type === "finish");
            const extras: CanvasNode[] = [
              ...(!hasStart  ? [{ id: "n_start",  type: "start"  as const, x: 140,  y: 225, data: {} }] : []),
              ...(!hasFinish ? [{ id: "n_finish", type: "finish" as const, x: 1150, y: 225, data: {} }] : []),
            ];
            return { ...loaded, nodes: [...extras, ...nodes] };
          });
          setCurrentId(wf.id);
          setPublishedAt(wf.published_at as any);
          setWorkflowName(wf.name || "New Workflow");
        } else {
          setCurrentId(wfId);
        }
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [wfId]);

  // Debounced save on commit
  const scheduleSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  function saveNow(nextState?: CanvasWorkflowState) {
    const payload = nextState || history.present;
    if (savingRef.current) return;
    savingRef.current = true;
    // Debug log to verify what we're sending to the backend
    try {
      console.log('[Canvas] saveNow: sending state', {
        workflowId: currentId,
        nodesLen: Array.isArray((payload as any)?.nodes) ? (payload as any).nodes.length : undefined,
        firstNodeType: (payload as any)?.nodes?.[0]?.type,
        edgesLen: Array.isArray((payload as any)?.edges) ? (payload as any).edges.length : undefined,
      });
    } catch {}

    (async () => {
      try {
        const wf = await saveWorkflow({ id: currentId, state: payload });
        try { console.log('[Canvas] saveNow: saved', { workflowId: wf?.id, nodesLen: (payload as any)?.nodes?.length }); } catch {}
        if (!currentId) {
          setCurrentId(wf.id);
          try { router.replace(`/builder/canvas?id=${wf.id}`); } catch {}
        }
      } catch (err) {
        logError('[Canvas] saveNow: saveWorkflow failed', err);
      } finally {
        savingRef.current = false;
      }
    })();
  }
  function scheduleSaveNow() {
    if (scheduleSave.current) clearTimeout(scheduleSave.current);
    scheduleSave.current = setTimeout(() => {
      try { console.log('[Canvas] scheduleSaveNow: trigger'); } catch {}
      saveNow();
    }, 600);
  }

  // ── Ctrl+C / Ctrl+V ───────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === "c") {
        const node = state.nodes.find((n) => n.id === state.selectedNodeId);
        if (node && node.type !== "start" && node.type !== "finish") clipboardNode.current = node;
      }

      if (e.key === "v") {
        if (!clipboardNode.current) return;
        e.preventDefault();
        const source = clipboardNode.current;
        history.commit((prev) => {
          const id = uid("node");
          const newNode: CanvasNode = {
            ...source,
            id,
            x: source.x + 40,
            y: source.y + 40,
            data: JSON.parse(JSON.stringify(source.data)),
          };
          return { ...prev, nodes: [...prev.nodes, newNode], selectedNodeId: id };
        });
        scheduleSaveNow();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedNodeId, state.nodes]);

  const createNode = (type: CanvasNodeType) => {
    try { console.log('[Canvas] createNode', { type }); } catch {}
    history.commit((prev) => {
      const id = uid("node");
      const pos = findFreeSpot({ nodes: prev.nodes, viewport: prev.viewport, type });
      const x = pos.x;
      const y = pos.y;

      const node: CanvasNode =
        type === "technician"
          ? { id, type, x, y, data: { technicianIds: [] } }
          : type === "priority"
            ? { id, type, x, y, data: { priorities: ["", "", ""] } }
            : { id, type: "route", x, y, data: { routes: [] } };

      return { ...prev, nodes: [...prev.nodes, node], selectedNodeId: id };
    });
    scheduleSaveNow();
  };

  const createEdge = ({
    from,
    to,
  }: {
    from: { nodeId: string; port: PortId };
    to: { nodeId: string; port: PortId };
  }) => {
    history.setPresent((prev) => {
      const exists = prev.edges.some(
        (e) =>
          (e.from.nodeId === from.nodeId && e.to.nodeId === to.nodeId) ||
          (e.from.nodeId === to.nodeId && e.to.nodeId === from.nodeId)
      );
      if (exists) return prev;
      const edge: CanvasEdge = {
        id: uid("edge"),
        from,
        to,
      };
      return { ...prev, edges: [...prev.edges, edge] };
    });
  };

  // No custom cursor; use native system cursor

  return (
    <div
      className="relative flex-1 w-full h-full rounded-3xl overflow-hidden"
      style={{
        // Fundo liso, removendo linhas de grade
        backgroundColor: "#bdbdbd",
      }}
      >
      {/* Top right: publish controls */}
      {(() => {
        const { errors, warnings } = validateWorkflow(state);
        const canPublish = errors.length === 0;
        return (
          <div className="pointer-events-auto absolute right-6 top-6 z-20 flex items-center gap-2">
            {publishedAt && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-600/15 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                Publicado
              </span>
            )}

            {/* Botão de diagnóstico — sempre visível quando há erros ou warnings */}
            {(!canPublish || warnings.length > 0) && (
              <button
                type="button"
                onClick={() => setShowValidation(true)}
                className="flex items-center gap-1.5 rounded-full border border-red-300/60 bg-red-50/90 px-3 py-1.5 text-[12px] font-semibold text-red-600 shadow-sm hover:bg-red-100 transition"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                Por que não consigo publicar?
              </button>
            )}

            <button
              type="button"
              disabled={!currentId || publishing || !canPublish}
              onClick={async () => {
                if (!currentId || !canPublish) return;
                setPublishing(true);
                try {
                  const next = await publishWorkflow(currentId, !publishedAt);
                  setPublishedAt(next.published_at as any);
                } catch (e) {
                  alert((e as any)?.message || 'Falha ao publicar');
                } finally { setPublishing(false); }
              }}
              title={!canPublish ? 'Corrija os erros antes de publicar' : (publishedAt ? 'Despublicar' : 'Publicar')}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--verde-primario)' }}
            >
              {publishing ? (
                'Salvando…'
              ) : publishedAt ? (
                <><GlobeLock className="h-3.5 w-3.5" />Despublicar</>
              ) : (
                <><Globe className="h-3.5 w-3.5" />Publicar</>
              )}
            </button>

            {/* Modal de validação */}
            {showValidation && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={() => setShowValidation(false)}
              >
                <div
                  className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => setShowValidation(false)}
                    className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition"
                  >
                    ✕
                  </button>

                  <h2 className="text-base font-bold text-zinc-900 mb-1">
                    Por que não consigo publicar?
                  </h2>
                  <p className="text-xs text-zinc-500 mb-5">
                    Corrija os itens abaixo para habilitar a publicação do workflow.
                  </p>

                  {errors.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                        Erros — bloqueiam publicação
                      </div>
                      <ul className="space-y-2">
                        {errors.map((msg, i) => (
                          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                            {msg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {warnings.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-500">
                        Avisos — não bloqueiam
                      </div>
                      <ul className="space-y-2">
                        {warnings.map((msg, i) => (
                          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                            {msg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {canPublish && warnings.length === 0 && (
                    <p className="text-sm text-emerald-600 font-medium">
                      Tudo certo! O workflow está pronto para publicação.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {/* Native cursor restored; no overlay */}
      {/* Top left: back + title (editable) */}
      <div className="pointer-events-auto absolute left-6 top-6 z-20 flex items-center gap-2">
        <button
          type="button"
          className="h-9 w-9 rounded-full bg-transparent hover:bg-black/5 flex items-center justify-center"
          aria-label="Voltar"
          onClick={() => {
            try {
              window.location.href = "/builder";
            } catch {}
          }}
        >
          <ChevronLeft className="h-5 w-5 text-emerald-700" />
        </button>
        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Escape') { setEditingName(false); return; }
              if (e.key === 'Enter') {
                if (!currentId) return setEditingName(false);
                const name = draftName.trim() || 'Sem título';
                setRenaming(true);
                try {
                  const next = await saveWorkflow({ id: currentId, name, state: history.present });
                  setWorkflowName(next.name || name);
                } catch (err) {
                  alert((err as any)?.message || 'Falha ao renomear');
                } finally {
                  setRenaming(false);
                  setEditingName(false);
                }
              }
            }}
            onBlur={async () => {
              if (!currentId) { setEditingName(false); return; }
              const name = draftName.trim();
              if (!name || name === workflowName) { setEditingName(false); return; }
              setRenaming(true);
              try {
                const next = await saveWorkflow({ id: currentId, name, state: history.present });
                setWorkflowName(next.name || name);
              } catch (err) {
                alert((err as any)?.message || 'Falha ao renomear');
              } finally {
                setRenaming(false);
                setEditingName(false);
              }
            }}
            className="text-lg font-semibold text-black bg-white/80 border border-zinc-300 rounded-md px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Nome do Workflow"
            disabled={renaming}
          />
        ) : (
          <button
            type="button"
            className="text-lg font-semibold text-black rounded px-1 hover:bg-black/5"
            title="Clique para renomear"
            onClick={() => { setDraftName(workflowName); setEditingName(true); }}
          >
            {workflowName}
          </button>
        )}
      </div>

      {/* Left palette */}
      <LeftPalette onCreate={createNode} />

      {/* Canvas surface */}
      <CanvasSurface
        mode={state.mode}
        viewport={state.viewport}
        nodes={state.nodes}
        edges={state.edges}
        selectedNodeId={state.selectedNodeId}
        onSelectNode={(id) => history.setPresent((prev) => ({ ...prev, selectedNodeId: id }))}
        onChangeViewport={(v) => history.setPresent((prev) => ({ ...prev, viewport: v }))}
        onMoveNode={(id, pos) =>
          history.setPresent((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...pos } : n)),
          }))
        }
        onCreateEdge={createEdge}
        onUpdateEdgeEnd={({ edgeId, end, nodeId, port }) =>
          history.setPresent((prev) => ({
            ...prev,
            edges: prev.edges.map((e) => {
              if (e.id !== edgeId) return e;
              return end === "from" ? { ...e, from: { nodeId, port } } : { ...e, to: { nodeId, port } };
            }),
          }))
        }
        onDeleteEdge={(edgeId) => history.setPresent((prev) => ({ ...prev, edges: prev.edges.filter((e) => e.id !== edgeId) }))}
        onCommit={() => { history.commit((p) => p); scheduleSaveNow(); }}
      />

      {/* Right inspector (config panel) */}
      <Inspector
        node={selectedNode}
        routeRank={routeRankForSelected}
        nodes={state.nodes}
        onChange={(next) => {
          history.commit((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) => (n.id === next.id ? next : n)),
          }));
          scheduleSaveNow();
        }}
        onDelete={() => {
          if (!state.selectedNodeId) return;
          const target = state.nodes.find((n) => n.id === state.selectedNodeId);
          if (target?.type === "start" || target?.type === "finish") return;
          history.commit((prev) => {
            const id = prev.selectedNodeId;
            return {
              ...prev,
              nodes: prev.nodes.filter((n) => n.id !== id),
              edges: prev.edges.filter((e) => e.from.nodeId !== id && e.to.nodeId !== id),
              selectedNodeId: null,
            };
          });
          scheduleSaveNow();
        }}
      />

      {/* Bottom dock */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <CanvasDock
          mode={state.mode}
          onChangeMode={(m) => history.setPresent((prev) => ({ ...prev, mode: m }))}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
        />
      </div>
    </div>
  );
}
