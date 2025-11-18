import { Fragment } from "react";

// Menções no conteúdo salvo (sem metadados):
// - Suporta nome com 2 partes (ex.: @Felipe Prieto ou @Felipe\u00A0Prieto)
// - Suporta preposições comuns: da/de/do/das/dos (ex.: @José da Silva)
// Evita engolir texto digitado depois limitando a até 2 partes significativas
const MENTION_REGEX = /@([^\s@]+(?:[ \u00A0](?:da|de|do|das|dos))?(?:[ \u00A0][^\s@]+))/g;

export function renderTextWithChips(text?: string | null) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MENTION_REGEX.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(line.slice(lastIndex, match.index));
      }
      const label = match[1]?.replace(/\u00A0/g, " ") || "";
      nodes.push(<Fragment key={`mention-${lineIdx}-${match.index}`}>@{label}</Fragment>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      nodes.push(line.slice(lastIndex));
    }
    return (
      <Fragment key={`line-${lineIdx}`}>
        {nodes.map((node, idx) =>
          typeof node === "string" ? (
            <Fragment key={`chunk-${lineIdx}-${idx}`}>{node}</Fragment>
          ) : (
            node
          )
        )}
        {lineIdx < lines.length - 1 ? <br key={`br-${lineIdx}`} /> : null}
      </Fragment>
    );
  });
}

