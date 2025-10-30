"use client";

import { Modal } from "@/legacy/components/kanban/components/Modal";

export function QuickActionsModal({ open, onClose, onMove, onDelete }: { open: boolean; onClose: () => void; onMove: () => void; onDelete: () => void }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Ações do Card">
      <div className="flex items-center justify-end gap-2">
        <button onClick={onMove} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">Mover…</button>
        <button onClick={onDelete} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Excluir…</button>
      </div>
    </Modal>
  );
}

