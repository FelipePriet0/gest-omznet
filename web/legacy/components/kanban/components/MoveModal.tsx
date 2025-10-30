"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/legacy/components/kanban/components/Modal";
import { changeStage } from "@/features/kanban/services";

const COMERCIAL = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'feitas', label: 'Feitas' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'canceladas', label: 'Canceladas' },
  { value: 'concluidas', label: 'Concluídas' },
];
const ANALISE = [
  { value: 'recebidos', label: 'Recebidos' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'reanalise', label: 'Reanálise' },
  { value: 'aprovados', label: 'Aprovados' },
  { value: 'negados', label: 'Negados' },
  { value: 'ass_app', label: 'Ass App' },
  { value: 'finalizados', label: 'Finalizados' },
  { value: 'canceladas', label: 'Canceladas' },
];

export function MoveModal({ open, onClose, cardId, presetArea, onMoved }: { open: boolean; onClose: () => void; cardId: string; presetArea?: 'comercial' | 'analise'; onMoved?: () => void }) {
  const [area, setArea] = useState<'comercial' | 'analise'>(presetArea ?? 'comercial');
  const [stage, setStage] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const stages = useMemo(() => (area === 'analise' ? ANALISE : COMERCIAL), [area]);
  const needsReason = stage === 'canceladas';

  async function onConfirm() {
    if (!stage) return;
    if (stage === 'entrada') {
      alert('A coluna Entrada não aceita movimentação para dentro.');
      return;
    }
    if (needsReason && reason.trim() === '') {
      alert('Informe o motivo para cancelar.');
      return;
    }
    setLoading(true);
    try {
      await changeStage(cardId, area, stage, needsReason ? reason : undefined);
      onMoved?.();
      onClose();
    } catch (e: any) {
      alert(e.message ?? 'Falha ao mover');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mover Card">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-zinc-700">Kanban</label>
          <select value={area} onChange={(e) => setArea(e.target.value as any)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm">
            <option value="comercial">Comercial</option>
            <option value="analise">Análise</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-700">Coluna</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm">
            <option value="">Escolha…</option>
            {stages.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {needsReason && (
          <div>
            <label className="mb-1 block text-sm text-zinc-700">Motivo</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" rows={3} />
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70">Confirmar</button>
        </div>
      </div>
    </Modal>
  );
}

