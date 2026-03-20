"use client";

import type { CanvasWorkflowState, CanvasNode, CanvasEdge } from "@/features/builder/canvas/types";
import type { ScheduleCard, Technician } from "./types";

type SuggestParams = {
  workflow: CanvasWorkflowState | null | undefined;
  technicians: Technician[];
  dateISO: string;
  cards: ScheduleCard[];
  applicantBairro?: string | null;
  tipoInstalacao?: string | null;
  timeSlots: readonly string[];
};

export function normalize(s?: string | null): string {
  return (s || "").toString().trim().toLowerCase();
}

// Directed adjacency: respect the arrow direction in the canvas (from -> to).
function buildAdjacencyOut(edges: CanvasEdge[]) {
  const out = new Map<string, Set<string>>();
  for (const e of edges || []) {
    if (!out.has(e.from.nodeId)) out.set(e.from.nodeId, new Set());
    out.get(e.from.nodeId)!.add(e.to.nodeId);
    // NOTE: we intentionally do NOT add the reverse edge; arrows encode precedence
  }
  return out;
}

function findCandidates(params: { wf: CanvasWorkflowState; bairro?: string | null; tipo?: string | null }): string[] {
  const { wf, bairro, tipo } = params;
  const nodes = wf.nodes || [];
  const edges = wf.edges || [];
  const adjOut = buildAdjacencyOut(edges);
  const bairroNorm = normalize(bairro);
  const tipoNorm = normalize(tipo);

  // Index nodes by id and by type
  const byId = new Map<string, CanvasNode>();
  const techNodes: CanvasNode[] = [];
  const routeNodes: CanvasNode[] = [];
  const priorityNodes: CanvasNode[] = [];
  for (const n of nodes) {
    byId.set(n.id, n);
    if (n.type === "technician") techNodes.push(n);
    if (n.type === "route") routeNodes.push(n);
    if (n.type === "priority") priorityNodes.push(n);
  }

  // Helper: does a route node include the bairro?
  const routeMatches = (n: CanvasNode) => {
    try {
      const routes = (n as any).data?.routes as string[] | undefined;
      if (!routes || routes.length === 0) return true; // no constraint
      return routes.map(normalize).includes(bairroNorm);
    } catch { return false; }
  };
  // Helper: does a priority node include the tipo value (fuzzy)?
  const priorityMatches = (n: CanvasNode) => {
    if (!tipoNorm) return true;
    try {
      const labels = (n as any).data?.priorities as string[] | undefined;
      if (!labels || labels.length === 0) return true;
      return labels.some((lbl) => normalize(lbl).includes(tipoNorm));
    } catch { return false; }
  };

  const candidates = new Set<string>();

  // Traverse from each technician node to see if it connects to matching route/priority nodes
  for (const t of techNodes) {
    const ids = new Set<string>(((t as any).data?.technicianIds || []) as string[]);
    if (ids.size === 0) continue;
    // Directed BFS from technician node following arrow direction
    const q: string[] = Array.from(adjOut.get(t.id) || []);
    const seen = new Set<string>([t.id]);
    let reachableRoute = false;
    let reachablePriority = false;
    let okRoute = false;     // becomes true if any reachable route node matches
    let okPriority = false;  // becomes true if any reachable priority node matches
    while (q.length) {
      const cur = q.shift()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const node = byId.get(cur);
      if (!node) continue;
      if (node.type === "route") {
        reachableRoute = true;
        if (routeMatches(node)) okRoute = true;
      }
      if (node.type === "priority") {
        reachablePriority = true;
        if (priorityMatches(node)) okPriority = true;
      }
      // Continue traversal along direction
      const next = Array.from(adjOut.get(cur) || []);
      for (const nb of next) if (!seen.has(nb)) q.push(nb);
    }
    // If there were no reachable constraints for this tech, treat as satisfied
    if (!reachableRoute) okRoute = true;
    if (!reachablePriority) okPriority = true;
    if (okRoute && okPriority) {
      for (const id of ids) candidates.add(id);
    }
  }
  return Array.from(candidates);
}

export function earliestFreeSlotFor(techId: string, dateISO: string, cards: ScheduleCard[], timeSlots: readonly string[]): string | null {
  const taken = new Set(cards.filter((c) => c.date === dateISO && c.technician_id === techId).map((c) => c.time_slot));
  for (const s of timeSlots) if (!taken.has(s)) return s;
  return null;
}

function bestPriorityRankForTech(wf: CanvasWorkflowState, techNode: CanvasNode, tipo?: string | null): number {
  const tipoNorm = normalize(tipo);
  const byId = new Map<string, CanvasNode>();
  for (const n of (wf.nodes || [])) byId.set(n.id, n);
  const adjOut = buildAdjacencyOut(wf.edges || []);
  const q: string[] = Array.from(adjOut.get(techNode.id) || []);
  const seen = new Set<string>([techNode.id]);
  let best = Number.POSITIVE_INFINITY;
  while (q.length) {
    const cur = q.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = byId.get(cur);
    if (!node) continue;
    if (node.type === 'priority') {
      try {
        const labels = ((node as any).data?.priorities || []) as string[];
        for (let i = 0; i < labels.length; i++) {
          const ln = normalize(labels[i]);
          if (!tipoNorm || !ln) continue;
          if (ln.includes(tipoNorm)) { best = Math.min(best, i); break; }
        }
      } catch {}
    }
    for (const nb of Array.from(adjOut.get(cur) || [])) if (!seen.has(nb)) q.push(nb);
  }
  return best;
}

export function suggestAssignment({ workflow, technicians, dateISO, cards, applicantBairro, tipoInstalacao, timeSlots }: SuggestParams): { technician_id: string | null; time_slot: string | null } {
  const activeTechIds = new Set(technicians.filter((t) => t.active).map((t) => t.id));
  // 1) From workflow
  let pool: string[] = [];
  if (workflow && workflow.nodes?.length) {
    pool = findCandidates({ wf: workflow, bairro: applicantBairro, tipo: tipoInstalacao }).filter((id) => activeTechIds.has(id));
  }
  // Fallback: take all active techs if no specific candidates
  if (!pool.length) pool = Array.from(activeTechIds);

  // 2) Order pool by per-tech priority rank derived from the workflow inspector ordering
  if (workflow && workflow.nodes?.length) {
    // Map technician nodes by contained technicianIds for rank lookup
    const techNodes = (workflow.nodes || []).filter((n) => n.type === 'technician');
    const techNodeByTechId = new Map<string, CanvasNode>();
    for (const n of techNodes) {
      const ids = new Set<string>(((n as any).data?.technicianIds || []) as string[]);
      for (const id of ids) techNodeByTechId.set(id, n);
    }
    pool = pool
      .map((id) => {
        const node = techNodeByTechId.get(id);
        const rank = node ? bestPriorityRankForTech(workflow!, node, tipoInstalacao) : Number.POSITIVE_INFINITY;
        return { id, rank };
      })
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.id);
  }

  // 3) Choose tech with earliest availability
  let chosenTech: string | null = null;
  let chosenSlot: string | null = null;
  for (const techId of pool) {
    const slot = earliestFreeSlotFor(techId, dateISO, cards, timeSlots);
    if (slot) { chosenTech = techId; chosenSlot = slot; break; }
  }
  // If all full, pick first tech & first slot
  if (!chosenTech) chosenTech = pool[0] || null;
  if (!chosenSlot) chosenSlot = timeSlots[0] || null;
  return { technician_id: chosenTech, time_slot: chosenSlot };
}
