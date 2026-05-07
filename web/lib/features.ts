/**
 * Feature flags centralizadas.
 * Para ocultar uma feature: mude para false.
 * Para reativar: mude para true.
 * O código correspondente permanece intacto — nada é deletado.
 */
export const FEATURES = {
  /** Botão de exportar/baixar ficha PDF nas fichas PF/PJ */
  exportarFicha: false,
  /** Botões de exportação CSV em telas operacionais */
  exportarCsv: false,
  /** Ações diretas de baixar/abrir anexo fora da pré-visualização */
  baixarAnexos: false,
} as const;
