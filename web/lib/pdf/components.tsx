import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// ─── Design tokens do globals.css ────────────────────────────────────────────
const C = {
  inputBg:     "#dbeafe",   // background azul dos inputs
  inputBorder: "#a1a1aa",   // border-bottom dos inputs
  inputColor:  "#18181b",   // cor do texto dos inputs
  labelPf:     "#000000",   // cor da label no PF
  labelPj:     "#52525b",   // cor da label no PJ
  red:         "#dc2626",   // vermelho (labels e valores)
  cardBorder:  "#9ca3af",   // borda da ficha
  cardHeader:  "#52525b",   // borda do card header
  tagBlack:    "#000000",   // tag preta (SPC etc.)
  tagYellow:   "#fff200",   // tag amarela (Filiação etc.)
  amber:       "#fffbeb",   // fundo do highlight row
  amberBorder: "#fcd34d",   // borda do highlight row
  amberLabel:  "#78350f",   // label dentro do highlight row
};

// Tamanhos em pt (1pt ≈ 1.33px)
const T = {
  labelFs: 7.5,    // 12px → 9pt, mas 7.5 fica melhor em A4
  inputFs: 9,      // 13px → 9.75pt, arredondado para 9
  inputH:  16,     // 27px → ~20pt, mas 16 cabe melhor
  rowGap:  4,      // gap entre linhas
  colGap:  3,      // gap entre colunas
};

const S = StyleSheet.create({
  // ── Página ───────────────────────────────────────────────────────
  page: {
    fontFamily: "Helvetica",
    fontSize: T.inputFs,
    paddingTop: 22,
    paddingBottom: 26,
    paddingHorizontal: 18,
    color: C.inputColor,
    backgroundColor: "#fff",
  },

  // ── Header / Footer ──────────────────────────────────────────────
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: `1pt solid ${C.cardBorder}`,
    paddingBottom: 3,
    marginBottom: 7,
  },
  pageHeaderTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#111" },
  pageHeaderSub:   { fontSize: 7.5, color: C.cardBorder },
  pageFooter: {
    position: "absolute",
    bottom: 8,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#aaa",
  },

  // ── Contêiner geral da ficha ──────────────────────────────────────
  fichaWrap: {
    border: `0.75pt solid ${C.cardBorder}`,
    borderRadius: 2,
    padding: 8,
  },

  // ── Card header (borda inferior escura, igual ao .pf-card-header) ─
  cardHeaderWrap: {
    borderBottom: `2pt solid ${C.cardHeader}`,
    paddingBottom: 2,
    marginBottom: 5,
  },
  cardHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: T.labelFs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#000",
  },
  cardHeaderRed: { color: C.red },

  // ── Linha de campos ────────────────────────────────────────────────
  // alignItems: "stretch" → todos os campos da linha têm a mesma altura
  row: {
    flexDirection: "row",
    gap: T.colGap,
    marginBottom: T.rowGap,
    alignItems: "stretch",
  },

  // ── Campo individual: LABEL EM CIMA + caixa azul embaixo ──────────
  // (igual a .ficha-pf label { display: block } + input)
  fieldCol: {
    flex: 1,
    flexDirection: "column",
  },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: T.labelFs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    lineHeight: 1.2,
    color: C.labelPf,
    marginBottom: 1,
  },
  labelPj:  { color: C.labelPj },
  labelRed: { color: C.red },

  // Caixa azul (input)
  valueBox: {
    flex: 1,              // ocupa o espaço restante na coluna
    minHeight: T.inputH,
    backgroundColor: C.inputBg,
    borderBottomWidth: 2,
    borderBottomColor: C.inputBorder,
    borderBottomStyle: "solid",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  valueText: {
    fontSize: T.inputFs,
    color: C.inputColor,
    lineHeight: 1.3,
  },
  valueTextRed: { color: C.red },

  // ── Textarea: label + caixa azul com altura mínima maior ──────────
  textareaWrap: {
    marginBottom: T.rowGap,
  },
  textareaBox: {
    backgroundColor: C.inputBg,
    borderBottomWidth: 2,
    borderBottomColor: C.inputBorder,
    borderBottomStyle: "solid",
    paddingHorizontal: 5,
    paddingVertical: 3,
    minHeight: 20,
  },
  textareaText: {
    fontSize: T.inputFs,
    color: C.inputColor,
    lineHeight: 1.4,
  },
  textareaTextRed: { color: C.red },

  // ── Tag preta (INFORMAÇÕES SPC etc.) ──────────────────────────────
  tagBlack: {
    backgroundColor: C.tagBlack,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: T.labelFs,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 1,
    alignSelf: "flex-start",
  },

  // ── Tag amarela (FILIAÇÃO, REFERÊNCIAS) ───────────────────────────
  tagYellow: {
    backgroundColor: C.tagYellow,
    color: "#000",
    fontFamily: "Helvetica-Bold",
    fontSize: T.labelFs,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 4,
    marginBottom: 3,
  },

  // ── Highlight row (Plano / Venc / SVA) ────────────────────────────
  highlightWrap: {
    backgroundColor: C.amber,
    borderWidth: 1,
    borderColor: C.amberBorder,
    borderStyle: "solid",
    borderRadius: 3,
    padding: 5,
    marginBottom: T.rowGap,
  },
  highlightLabel: { color: C.amberLabel },

  // ── Divider ────────────────────────────────────────────────────────
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: "#e5e5e5",
    borderTopStyle: "solid",
    marginTop: 3,
    marginBottom: 4,
  },

  // ── Pareceres ──────────────────────────────────────────────────────
  noteRoot:    { marginBottom: 5 },
  noteReply:   { marginBottom: 5, paddingLeft: 10, borderLeft: "2pt solid #e5e5e5" },
  noteMeta:    { flexDirection: "row", gap: 5, marginBottom: 1 },
  noteAuthor:  { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#555" },
  noteDate:    { fontSize: 7, color: "#999" },
  noteDecAprov:{ fontFamily: "Helvetica-Bold", fontSize: 7, color: "#15803d" },
  noteDecNeg:  { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#b91c1c" },
  noteDecWarn: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#92400e" },
  noteText:    { fontSize: 8.5, color: "#111", lineHeight: 1.4 },
});

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Variant    = "pf" | "pj";
type TagStyle   = "label" | "black" | "yellow" | "none";
type NoteItem   = {
  id: string; text: string;
  author_name?: string | null; decision?: string | null;
  created_at?: string | null;  parent_id?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function labelStyle(variant: Variant, red?: boolean) {
  return [
    S.label,
    variant === "pj" ? S.labelPj : undefined,
    red            ? S.labelRed  : undefined,
  ].filter(Boolean) as any;
}

function stripMentions(t: string) {
  return (t || "")
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1")
    .replace(/\[decision:[^\]]+\]/g, "")
    .trim();
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return ""; }
}

// ─── Primitivos ──────────────────────────────────────────────────────────────

/** Campo individual: label em cima + caixa azul embaixo, ocupa `flex` colunas */
export function PdfField({
  label, value, red, flex = 1, variant = "pf", highlight,
}: {
  label: string; value?: string | null; red?: boolean;
  flex?: number; variant?: Variant; highlight?: boolean;
}) {
  const ls = highlight
    ? [S.label, S.highlightLabel].filter(Boolean) as any
    : labelStyle(variant, red);

  const vs = [S.valueText, red ? S.valueTextRed : undefined].filter(Boolean) as any;

  return (
    <View style={[S.fieldCol, { flex }]}>
      {label ? <Text style={ls}>{label}</Text> : null}
      <View style={S.valueBox}>
        <Text style={vs}>{value ?? ""}</Text>
      </View>
    </View>
  );
}

/** Textarea: label em cima (normal / tag preta / tag amarela) + caixa azul */
export function PdfTextarea({
  label, value, red, variant = "pf", tagStyle = "label", inRow,
}: {
  label: string; value?: string | null; red?: boolean;
  variant?: Variant; tagStyle?: TagStyle; inRow?: boolean;
}) {
  let labelEl: React.ReactNode = null;

  if (tagStyle === "black" && label) {
    labelEl = <View style={S.tagBlack}><Text>{label}</Text></View>;
  } else if (tagStyle === "yellow" && label) {
    labelEl = <View style={S.tagYellow}><Text>{label}</Text></View>;
  } else if (tagStyle === "label" && label) {
    labelEl = <Text style={labelStyle(variant, red)}>{label}</Text>;
  }

  const ts = [S.textareaText, red ? S.textareaTextRed : undefined].filter(Boolean) as any;

  // Quando dentro de um PdfRow (inRow=true) não adiciona marginBottom próprio
  // para não conflitar com o gap do row
  return (
    <View style={inRow ? { flex: 1 } : S.textareaWrap}>
      {labelEl}
      <View style={S.textareaBox}>
        <Text style={ts}>{value ?? ""}</Text>
      </View>
    </View>
  );
}

/** Linha de campos — flex row com gap */
export function PdfRow({ children }: { children: React.ReactNode }) {
  return <View style={S.row}>{children}</View>;
}

/** Card com header opcional (borda inferior escura) */
export function PdfCard({
  title, red, children,
}: {
  title?: string; red?: boolean; children: React.ReactNode;
}) {
  return (
    <View>
      {title ? (
        <View style={S.cardHeaderWrap}>
          <Text style={[S.cardHeaderText, red ? S.cardHeaderRed : {}] as any}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Bloco amber para Plano / Venc / SVA (igual ao .pj-highlight-row) */
export function PdfHighlightRow({ children }: { children: React.ReactNode }) {
  return <View style={S.highlightWrap}>{children}</View>;
}

/** Separador leve entre seções */
export function PdfDivider() {
  return <View style={S.divider} />;
}

// ─── Pareceres ───────────────────────────────────────────────────────────────

function decStyle(d?: string | null) {
  if (d === "aprovado") return S.noteDecAprov;
  if (d === "negado")   return S.noteDecNeg;
  if (d)                return S.noteDecWarn;
  return null;
}
const decLabel: Record<string, string> = { aprovado: "Aprovado", negado: "Negado", reanalise: "Reanálise" };

function PdfNote({ note, isReply }: { note: NoteItem; isReply?: boolean }) {
  const ds = decStyle(note.decision);
  return (
    <View style={isReply ? S.noteReply : S.noteRoot}>
      <View style={S.noteMeta}>
        <Text style={S.noteAuthor}>{note.author_name || "Anônimo"}</Text>
        <Text style={S.noteDate}>{fmtDate(note.created_at)}</Text>
        {ds && note.decision
          ? <Text style={ds}>[{decLabel[note.decision] ?? note.decision}]</Text>
          : null}
      </View>
      <Text style={S.noteText}>{stripMentions(note.text)}</Text>
    </View>
  );
}

export function PdfNotesList({ notes }: { notes: NoteItem[] }) {
  if (!notes?.length) return null;
  const roots   = notes.filter(n => !n.parent_id);
  const replies = notes.filter(n => !!n.parent_id);
  return (
    <View>
      {roots.map(root => (
        <View key={root.id}>
          <PdfNote note={root} />
          {replies.filter(r => r.parent_id === root.id).map(r => (
            <PdfNote key={r.id} note={r} isReply />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Wrapper de página ────────────────────────────────────────────────────────
export function FichaPage({
  title, subtitle, children,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={S.page}>
      <View style={S.pageHeader} fixed>
        <Text style={S.pageHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={S.pageHeaderSub}>{subtitle}</Text> : null}
      </View>
      <View style={S.fichaWrap}>{children}</View>
      <View style={S.pageFooter} fixed>
        <Text>Gerado em {new Date().toLocaleDateString("pt-BR")}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}
