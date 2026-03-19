"use client";

import { useState } from "react";
import { Modal } from "@/legacy/components/kanban/components/Modal";
import { changeStage } from "@/features/kanban/services";

export function CancelModal({ open, onClose, cardId, area, onCancelled }: { open: boolean; onClose: () => void; cardId: string; area: "comercial" | "analise"; onCancelled?: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  function closeAll() {
    setReason("");
    onClose();
  }

  async function confirm() {
    if (!reason.trim()) { alert("Informe o motivo do cancelamento."); return; }
    setLoading(true);
    try {
      await changeStage(cardId, area, "canceladas", reason.trim());
      onCancelled?.();
      closeAll();
    } catch (e: any) {
      alert(e?.message || "Não foi possível cancelar a ficha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={closeAll} title="Cancelar ficha">
      <div className="space-y-3">
        <p className="text-sm text-zinc-700">Informe o motivo do cancelamento. Esta ação será registrada.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-[8px] border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
          rows={3}
          placeholder="Ex: Cliente desistiu / Dados inconsistentes"
        />
        <div className="flex items-center justify-end gap-2">
          <button onClick={confirm} disabled={loading} className="h-9 rounded-[8px] bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70">Confirmar</button>
        </div>
      </div>
    </Modal>
  );
}


