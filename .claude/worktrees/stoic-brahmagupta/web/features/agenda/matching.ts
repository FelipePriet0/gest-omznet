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

function buildAdjacency(edges: CanvasEdge[]) {
  const map = new Map<string, Set<string>>();
  for (const e of edges || []) {
    if (!map.has(e.from.nodeId)) map.set(e.from.nodeId, new Set());
    if (!map.has(e.to.nodeId)) map.set(e.to.nodeId, new Set());
    map.get(e.from.nodeId)!.add(e.to.nodeId);
    map.get(e.to.nodeId)!.add(e.from.nodeId);
  }
  return map;
}

function findCandidates(params: { wf: CanvasWorkflowState; bairro?: string | null; tipo?: string | null }): string[] {
  const { wf, bairro, tipo } = params;
  const nodes = wf.nodes || [];
  const edges = wf.edges || [];
  const adj = buildAdjacency(edges);
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
    // BFS limited depth
    const q: string[] = [t.id];
    const seen = new Set<string>([t.id]);
    let okRoute = routeNodes.length === 0; // if no routes configured, accept
    let okPriority = priorityNodes.length === 0; // if no priorities configured, accept
    while (q.length) {
      const cur = q.shift()!;
      const neigh = Array.from(adj.get(cur) || []);
      for (const nb of neigh) {
        if (seen.has(nb)) continue;
        seen.add(nb);
        const node = byId.get(nb);
        if (!node) continue;
        if (node.type === "route" && routeMatches(node)) okRoute = true;
        if (node.type === "priority" && priorityMatches(node)) okPriority = true;
        q.push(nb);
      }
    }
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

export function suggestAssignment({ workflow, technicians, dateISO, cards, applicantBairro, tipoInstalacao, timeSlots }: SuggestParams): { technician_id: string | null; time_slot: string | null } {
  const activeTechIds = new Set(technicians.filter((t) => t.active).map((t) => t.id));
  // 1) From workflow
  let pool: string[] = [];
  if (workflow && workflow.nodes?.length) {
    pool = findCandidates({ wf: workflow, bairro: applicantBairro, tipo: tipoInstalacao }).filter((id) => activeTechIds.has(id));
  }
  // Fallback: take all active techs if no specific candidates
  if (!pool.length) pool = Array.from(activeTechIds);

  // 2) Choose tech with earliest availability
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

