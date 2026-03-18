export type Technician = {
  id: string;
  name: string;
  active: boolean;
};

export type FreeRow = {
  id: string;           // UUID da linha livre no banco
  display_order: number; // ordem global (a mesma em todos os dias)
};

export type ScheduleStatus = 'aprovado' | 'reanalise' | 'mudanca_endereco';

export type ScheduleCard = {
  id: string;
  applicant_id: string;
  date: string; // YYYY-MM-DD
  technician_id: string;
  free_row_id?: string | null; // UUID da linha livre (quando sem técnico)
  time_slot: string; // 08:30 | 10:30 | 13:30 | 15:30 — primeiro slot (referência)
  time_slots?: string[]; // todos os slots (ex: ["08:30","10:30"])
  cliente: string;
  plano?: string | null;
  bairro?: string | null;
  tipo_instalacao?: string | null;
  status: ScheduleStatus;
  // Campos de estágio/área vindos do kanban_cards
  area?: string | null;   // 'comercial' | 'analise'
  stage?: string | null;  // 'em_analise' | 'aprovados' | 'negados' | 'reanalise' | ...
};
