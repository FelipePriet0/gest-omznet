"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgendamentoIndexPage() {
  const router = useRouter();
  useEffect(() => {
    // Por padrão, direciona para a Agenda
    router.replace("/agendamento/agenda");
  }, [router]);
  return null;
}

