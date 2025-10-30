"use client";

import { useState } from "react";
import { Modal } from "@/legacy/components/kanban/components/Modal";
import { softDeleteCard } from "@/features/kanban/services";

export function DeleteFlow({ open, onClose, cardId, applicantName, cpfCnpj, onDeleted }: { open: boolean; onClose: () => void; cardId: string; applicantName: string; cpfCnpj: string; onDeleted?: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  function closeAll() {
    setStep(1);
    setReason('');
    onClose();
  }

  async function confirm() {
    setLoading(true);
    try {
      await softDeleteCard(cardId, reason || undefined);
      onDeleted?.();
      closeAll();
    } catch (e: any) {
      alert(e.message ?? 'Não foi possível excluir.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={closeAll} title={step === 1 ? 'Deletar Ficha' : 'Confirmação Final'}>
      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-700">Tem certeza que deseja excluir a ficha abaixo? Ela será movida para o histórico de exclusões.</p>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <div className="font-medium">{applicantName}</div>
            <div className="text-zinc-600">{cpfCnpj}</div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={closeAll} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">Cancelar</button>
            <button onClick={() => setStep(2)} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Sim, Deletar</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-700">Esta ação não pode ser desfeita. Opcionalmente, informe um motivo.</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" rows={3} />
          <div className="flex items-center justify-end gap-2">
            <button onClick={closeAll} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">Cancelar</button>
            <button onClick={confirm} disabled={loading} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70">Confirmar Exclusão</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

