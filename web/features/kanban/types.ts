export type KanbanStage =
  | "entrada"
  | "feitas"
  | "cadastrar_no_mk"
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
  applicantName: string;
  cpfCnpj: string;
  phone?: string;
  whatsapp?: string;
  bairro?: string;
  dueAt?: string;
}

