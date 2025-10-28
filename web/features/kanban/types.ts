export type KanbanStage =
  | "entrada"
  | "feitas"
  | "recebidos"
  | "em_analise"
  | "reanalise"
  | "aprovados"
  | "negados"
  | "ass_app"
  | "finalizados"
  | "canceladas";

export type KanbanArea = "comercial" | "analise";

export interface KanbanCard {
  id: string;
  applicantId?: string;
  applicantName: string;
  cpfCnpj: string;
  phone?: string;
  whatsapp?: string;
  bairro?: string;
  dueAt?: string;
  area?: 'comercial' | 'analise';
  stage?: string;
  onOpen?: () => void;
  onMenu?: () => void;
  extraAction?: React.ReactNode;
}
