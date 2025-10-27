import { KanbanColumn } from "@/features/kanban/components/KanbanColumn";
import { KanbanCard } from "@/features/kanban/types";

const mock: Record<string, KanbanCard[]> = {
  recebidos: [
    {
      id: "1",
      applicantName: "João da Silva",
      cpfCnpj: "123.456.789-00",
      whatsapp: "(11) 9 9999-9999",
      bairro: "Centro",
    },
  ],
  em_analise: [],
  reanalise: [],
  aprovados: [],
  negados: [],
  ass_app: [],
  finalizados: [],
  canceladas: [],
};

export function KanbanBoardAnalise() {
  return (
    <div className="flex w-full flex-1 gap-4 overflow-x-auto pb-2">
      <KanbanColumn title="Recebidos" cards={mock.recebidos} />
      <KanbanColumn title="Em Análise" cards={mock.em_analise} />
      <KanbanColumn title="Reanálise" cards={mock.reanalise} />
      <KanbanColumn title="Aprovados" cards={mock.aprovados} />
      <KanbanColumn title="Negados" cards={mock.negados} />
      <KanbanColumn title="Ass App" cards={mock.ass_app} />
      <KanbanColumn title="Finalizados" cards={mock.finalizados} />
      <KanbanColumn title="Canceladas" cards={mock.canceladas} />
    </div>
  );
}

