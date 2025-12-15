export type Technician = {
  id: string;
  name: string;
  active: boolean;
};

export type ScheduleStatus = 'aprovado' | 'reanalise' | 'mudanca_endereco';

export type ScheduleCard = {
  id: string;
  date: string; // YYYY-MM-DD
  technician_id: string;
  time_slot: string; // 08:30 | 10:30 | 13:30 | 15:30
  cliente: string;
  bairro?: string | null;
  tipo_instalacao?: string | null; // casa | prédio | prumada | ip_fixo | etc
  status: ScheduleStatus;
};

