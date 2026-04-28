/**
 * Feature flags centralizadas.
 * Para ocultar uma feature: mude para false.
 * Para reativar: mude para true.
 * O código correspondente permanece intacto — nada é deletado.
 */
export const FEATURES = {
  /** Coluna direita "Conversas Co-relacionadas" nas fichas PF/PJ */
  conversasCoRelacionadas: false,
  /** Item "Minhas Tarefas" no sidebar + painel lateral */
  minhasTarefas: false,
  /** Botão de exportar/baixar ficha PDF nas fichas PF/PJ */
  exportarFicha: true,
} as const;
