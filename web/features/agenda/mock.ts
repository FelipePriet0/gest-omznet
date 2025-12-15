import type { ScheduleCard, Technician } from "./types";

export const TIME_SLOTS = ["08:30", "10:30", "13:30", "15:30"] as const;

export function initialTechnicians(): Technician[] {
  return [
    { id: "tech-ana", name: "Ana Silva", active: true },
    { id: "tech-joao", name: "João Souza", active: true },
    { id: "tech-maria", name: "Maria Lima", active: true },
    { id: "tech-lucas", name: "Lucas Rocha", active: true },
  ];
}

export function initialCards(dateISO: string): ScheduleCard[] {
  return [
    { id: "sch-1", date: dateISO, technician_id: "tech-ana", time_slot: "08:30", cliente: "Carlos Pereira", bairro: "Centro", tipo_instalacao: "casa", status: "aprovado" },
    { id: "sch-2", date: dateISO, technician_id: "tech-joao", time_slot: "10:30", cliente: "Ana Paula", bairro: "Jardins", tipo_instalacao: "prédio", status: "reanalise" },
    { id: "sch-3", date: dateISO, technician_id: "tech-maria", time_slot: "13:30", cliente: "Marcos Lima", bairro: "Vila Nova", tipo_instalacao: "prumada", status: "mudanca_endereco" },
  ];
}

