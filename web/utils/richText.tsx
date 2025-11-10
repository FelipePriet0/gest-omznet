import { Fragment } from "react";

const MENTION_REGEX = /@([^\s@]+)/g;

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
      nodes.push(
        <span
          key={`mention-${lineIdx}-${match.index}`}
          className="mention-chip mention-chip-inline"
        >
          @{match[1]}
        </span>
      );
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

