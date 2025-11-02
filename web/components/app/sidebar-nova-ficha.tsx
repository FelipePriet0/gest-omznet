"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PersonTypeModal } from "@/legacy/components/cadastro/components/PersonTypeModal";
import { BasicInfoModal } from "@/legacy/components/cadastro/components/BasicInfoModal";
import type { PessoaTipo } from "@/features/cadastro/types";
import { motion } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";

export const SidebarNovaFicha = () => {
  const { open } = useSidebar();
  const [openPersonType, setOpenPersonType] = useState(false);
  const [openBasicInfo, setOpenBasicInfo] = useState(false);
  const [tipoSel, setTipoSel] = useState<PessoaTipo | null>(null);

  return (
    <>
      <button
        onClick={() => setOpenPersonType(true)}
        className="flex items-center gap-3 w-full p-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors group"
      >
        <Plus className="h-6 w-6 flex-shrink-0" />
        <motion.span
          animate={{
            display: open ? "inline-block" : "none",
            opacity: open ? 1 : 0,
          }}
          className="text-base font-semibold whitespace-pre"
        >
          Nova Ficha
        </motion.span>
      </button>

      {/* Modals de Cadastro */}
      <PersonTypeModal
        open={openPersonType}
        onClose={() => setOpenPersonType(false)}
        onSelect={(tipo) => {
          setTipoSel(tipo);
          setOpenPersonType(false);
          setOpenBasicInfo(true);
        }}
      />
      <BasicInfoModal
        open={openBasicInfo}
        tipo={tipoSel}
        onBack={() => {
          setOpenBasicInfo(false);
          setOpenPersonType(true);
        }}
        onClose={() => {
          setOpenBasicInfo(false);
          setTipoSel(null);
        }}
      />
    </>
  );
};
