"use client";

import React from "react";
import { PessoaTipo } from "@/features/cadastro/types";

export function PersonTypeModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (tipo: PessoaTipo) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] max-w-[560px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Escolher tipo de pessoa</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            className="group rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100"
            onClick={() => onSelect("PF")}
          >
            <div className="mb-2 text-sm font-medium text-emerald-900">👤 Pessoa Física (PF)</div>
            <div className="text-xs text-emerald-800/80">Continuar para Dados Básicos - Ficha PF</div>
          </button>
          <button
            className="group rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100"
            onClick={() => onSelect("PJ")}
          >
            <div className="mb-2 text-sm font-medium text-emerald-900">🏢 Pessoa Jurídica (PJ)</div>
            <div className="text-xs text-emerald-800/80">Continuar para Dados Básicos - Ficha PJ</div>
          </button>
        </div>

        {/* Removido CTA Cancelar conforme solicitação */}
      </div>
    </div>
  );
}
