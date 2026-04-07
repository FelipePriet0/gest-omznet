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
  /** Exibe bloco de parecer I.A (demo) somente para apresentação */
  demoParecerIA: process.env.NEXT_PUBLIC_DEMO_IA_PARECER === '1',
} as const;
