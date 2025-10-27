import { KanbanColumn } from "@/features/kanban/components/KanbanColumn";
import { KanbanCard } from "@/features/kanban/types";

// Board Comercial
const mockComercial: Record<string, KanbanCard[]> = {
  entrada: [
    {
      id: "c1",
      applicantName: "Maria Lima",
      cpfCnpj: "987.654.321-00",
      whatsapp: "(11) 9 8888-7777",
      bairro: "Jardins",
    },
    {
      id: "c2",
      applicantName: "João Silva",
      cpfCnpj: "123.456.789-00",
      whatsapp: "(11) 9 9999-8888",
      bairro: "Vila Madalena",
    },
  ],
  feitas: [
    {
      id: "c3",
      applicantName: "Ana Costa",
      cpfCnpj: "456.789.123-00",
      whatsapp: "(11) 9 7777-6666",
      bairro: "Pinheiros",
    },
  ],
  aguardando: [],
  canceladas: [],
  concluidas: [],
};

const columnConfig = [
  { key: "entrada", title: "Entrada", color: "blue", icon: "🔵" },
  { key: "feitas", title: "Feitas", color: "green", icon: "🟢" },
  { key: "aguardando", title: "Aguardando", color: "yellow", icon: "🟡" },
  { key: "canceladas", title: "Canceladas", color: "red", icon: "🔴" },
  { key: "concluidas", title: "Concluídas", color: "purple", icon: "🟣" },
];

export function KanbanBoard() {
  return (
    <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 overflow-x-auto overflow-y-visible pb-2 -mx-2 px-2">
      <div className="flex w-full flex-1 gap-4 sm:gap-6 pb-4 min-w-max">
        {columnConfig.map((column) => (
          <KanbanColumn
            key={column.key}
            title={column.title}
            cards={mockComercial[column.key as keyof typeof mockComercial]}
            color={column.color}
            icon={column.icon}
            count={mockComercial[column.key as keyof typeof mockComercial].length}
          />
        ))}
      </div>
    </div>
  );
}
