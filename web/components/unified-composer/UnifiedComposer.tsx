import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import clsx from "clsx";

export type ComposerDecision = "aprovado" | "negado" | "reanalise";

export type ComposerMention = {
  id?: string | null;
  label: string;
};

export type ComposerValue = {
  decision: ComposerDecision | null;
  text: string;
  mentions?: ComposerMention[];
};

export type UnifiedComposerHandle = {
  focus: () => void;
  setDecision: (decision: ComposerDecision | null) => void;
  insertText: (text: string) => void;
  insertMention: (mention: ComposerMention) => void;
  reset: () => void;
  setValue: (value: ComposerValue) => void;
  getSelectionRect: () => DOMRect | null;
};

type UnifiedComposerProps = {
  placeholder?: string;
  defaultValue?: ComposerValue;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  richText?: boolean; // habilita toolbar e formatação inline
  onChange?: (value: ComposerValue) => void;
  onSubmit?: (value: ComposerValue) => void;
  onCancel?: () => void;
  onRequestDecision?: (decision: ComposerDecision) => void;
  onRequestTask?: () => void;
  onRequestAttachment?: () => void;
  onMentionTrigger?: (query: string, rect: DOMRect | null) => void;
  onMentionClose?: () => void;
  onCommandTrigger?: (query: string, rect: DOMRect | null) => void;
  onCommandClose?: () => void;
};

const DEFAULT_VALUE: ComposerValue = {
  decision: null,
  text: "",
  mentions: [],
};

const CHIP_META: Record<ComposerDecision, { label: string; className: string }> = {
  aprovado: {
    label: "Aprovado",
    className: "decision-chip--primary",
  },
  negado: {
    label: "Negado",
    className: "decision-chip--destructive",
  },
  reanalise: {
    label: "Reanálise",
    className: "decision-chip--warning",
  },
};

function cloneMentions(mentions?: ComposerMention[] | null): ComposerMention[] {
  return Array.isArray(mentions) ? mentions.map((m) => ({ ...m })) : [];
}

function extractMentionsFromText(text?: string | null): ComposerMention[] {
  if (!text) return [];
  const matches: ComposerMention[] = [];
  // Apenas NBSP (\u00A0) dentro do nome da menção para evitar capturar texto seguinte
  // Ex.: @Felipe\u00A0Prieto texto comum → captura só "Felipe\u00A0Prieto"
  const regex = /@([^\s@]+(?:\u00A0[^\s@]+)*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const label = match[1].replace(/\u00A0/g, " ");
    matches.push({ label });
  }
  return matches;
}

function normalizeValue(val?: ComposerValue | null): ComposerValue {
  if (!val) {
    return { ...DEFAULT_VALUE, mentions: [] };
  }
  const normalized: ComposerValue = {
    decision: val.decision ?? null,
    text: val.text ?? "",
    mentions: cloneMentions(val.mentions),
  };
  if (!normalized.mentions || normalized.mentions.length === 0) {
    normalized.mentions = extractMentionsFromText(normalized.text);
  }
  return normalized;
}

function escapeHTML(str: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTextWithMentions(text: string, mentions?: ComposerMention[]): string {
  const safeText = text ?? "";
  const list =
    mentions && mentions.length > 0 ? cloneMentions(mentions) : extractMentionsFromText(safeText);
  if (safeText.length === 0) {
    return "";
  }
  let html = "";
  let cursor = 0;
  list.forEach((mention) => {
    const label = mention.label || "";
    const tokenNbsp = `@${label.replace(/ /g, "\u00A0")}`;
    const tokenSpace = `@${label}`;
    const idxNbsp = safeText.indexOf(tokenNbsp, cursor);
    const idxSpace = safeText.indexOf(tokenSpace, cursor);
    let index = -1;
    let token = tokenNbsp;
    if (idxNbsp >= 0 && idxSpace >= 0) {
      index = Math.min(idxNbsp, idxSpace);
      token = index === idxNbsp ? tokenNbsp : tokenSpace;
    } else if (idxNbsp >= 0) {
      index = idxNbsp;
      token = tokenNbsp;
    } else if (idxSpace >= 0) {
      index = idxSpace;
      token = tokenSpace;
    }
    if (index === -1) return;
    const before = safeText.slice(cursor, index);
    if (before.length > 0) {
      html += escapeHTML(before).replace(/\n/g, "<br/>");
    }
    const labelAttr = escapeHTML(label);
    // Renderiza menção como texto puro (sem wrapper/estilização)
    html += `@${labelAttr}`;
    cursor = index + token.length;
  });
  const rest = safeText.slice(cursor);
  if (rest.length > 0) {
    html += escapeHTML(rest).replace(/\n/g, "<br/>");
  }
  return html;
}

function sanitizeHTML(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div>/gi, "")
    .replace(/<\/?span[^>]*>/gi, "")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "");
}

export const UnifiedComposer = forwardRef<UnifiedComposerHandle, UnifiedComposerProps>(
  (
    {
      placeholder,
      defaultValue,
      disabled,
      autoFocus,
      className,
      richText,
      onChange,
      onSubmit,
      onCancel,
      onRequestDecision,
      onMentionTrigger,
      onMentionClose,
      onCommandTrigger,
      onCommandClose,
    },
    ref
  ) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [valueState, setValueState] = useState<ComposerValue>(
      normalizeValue(defaultValue ?? DEFAULT_VALUE)
    );
    const mentionLockRef = useRef(false);
    // Stabilize onChange to avoid effect loop when parent recreates the callback
    const onChangeRef = useRef<typeof onChange>();
    onChangeRef.current = onChange;
    const [openHeading, setOpenHeading] = useState(false);
    const [fmtBold, setFmtBold] = useState(false);
    const [fmtItalic, setFmtItalic] = useState(false);
    const [fmtUL, setFmtUL] = useState(false);
    const [fmtOL, setFmtOL] = useState(false);
    const [fmtBlock, setFmtBlock] = useState<string>("P");
    const [openMore, setOpenMore] = useState(false);
    const headingRef = useRef<HTMLDivElement | null>(null);
    const moreRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (!rootRef.current) return;
          rootRef.current.focus();
          placeCaretAtEnd(rootRef.current);
        },
        setDecision: (decision) => {
          let cleanText = valueState.text;
          if (decision) {
            cleanText = cleanText.replace(/\s*\/[\w]*$/, "").trimEnd();
          }

          const next: ComposerValue = {
            decision,
            text: cleanText,
            mentions: cloneMentions(valueState.mentions),
          };
          setValueState(next);
          if (decision) {
            onRequestDecision?.(decision);
          }
          applyStateToDOM(next);
          requestAnimationFrame(() => {
            if (rootRef.current) {
              rootRef.current.focus();
              placeCaretAtEnd(rootRef.current);
            }
          });
        },
        insertText: (text) => {
          if (!rootRef.current) return;
          insertTextAtCursor(text);
        },
        insertMention: (mention) => {
          if (!rootRef.current) return;
          const current = getCurrentValue();
          const root = rootRef.current;
          root.focus();
          const preceding = getPrecedingText(root);
          const match = preceding.match(/@([\w\s]*)$/);
          if (!match) return;
          const start = preceding.length - match[0].length;
          const before = preceding.slice(0, start);
          const afterSegment = current.text.slice(preceding.length);
          let tail = afterSegment;
          if (!(tail.length > 0 && /^\s/.test(tail))) {
            tail = ` ${tail}`;
          }
          const labelNbsp = (mention.label || '').replace(/ /g, "\u00A0");
          const updatedText = `${before}@${labelNbsp}${tail}`;
          const nextMentions = [...cloneMentions(current.mentions), { ...mention }];
          const next: ComposerValue = {
            decision: current.decision,
            text: updatedText,
            mentions: nextMentions,
          };
          setValueState(next);
          applyStateToDOM(next, { skipCaret: true });
          requestAnimationFrame(() => {
            if (!rootRef.current) return;
            focusAfterMention(rootRef.current, mention);
          });
        mentionLockRef.current = true;
          onMentionClose?.();
        },
        reset: () => {
          const next = normalizeValue(DEFAULT_VALUE);
          setValueState(next);
          applyStateToDOM(next);
          onChange?.(next);
        },
        setValue: (val) => {
          const next = normalizeValue(val ?? DEFAULT_VALUE);
          setValueState(next);
          applyStateToDOM(next);
        },
        getSelectionRect: () => {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return null;
          const range = selection.getRangeAt(0).cloneRange();
          if (range.getClientRects().length === 0) return null;
          return range.getBoundingClientRect();
        },
      }),
      [valueState, onRequestDecision, onMentionClose, onChange]
    );

    useEffect(() => {
      applyStateToDOM(valueState);
      if (autoFocus) {
        requestAnimationFrame(() => {
          if (rootRef.current) {
            rootRef.current.focus();
            placeCaretAtEnd(rootRef.current);
          }
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      onChangeRef.current?.(valueState);
    }, [valueState]);

    // Observa seleção para refletir estado ativo dos botões
    useEffect(() => {
      if (!richText) return;
      function updateStates() {
        try {
          // Detecta bold/italic apenas se houver marcação inline (<b>/<strong>, <i>/<em>),
          // ignorando o peso de fonte herdado por headings (H1..H4)
          const sel = window.getSelection();
          let hasInlineBold = false;
          let hasInlineItalic = false;
          if (sel && sel.anchorNode) {
            let el: HTMLElement | null = (sel.anchorNode as any).nodeType === Node.ELEMENT_NODE
              ? (sel.anchorNode as HTMLElement)
              : ((sel.anchorNode as Node).parentElement as HTMLElement | null);
            while (el) {
              const tag = (el.tagName || '').toUpperCase();
              if (tag === 'B' || tag === 'STRONG') { hasInlineBold = true; break; }
              el = el.parentElement as HTMLElement | null;
            }
            el = ((sel.anchorNode as Node).parentElement as HTMLElement | null);
            while (el) {
              const tag = (el.tagName || '').toUpperCase();
              if (tag === 'I' || tag === 'EM') { hasInlineItalic = true; break; }
              el = el.parentElement as HTMLElement | null;
            }
          }
          const ul = document.queryCommandState('insertUnorderedList');
          const ol = document.queryCommandState('insertOrderedList');
          let block = document.queryCommandValue('formatBlock') as string;
          if (!block || block === 'undefined') block = 'P';
          setFmtBold(!!hasInlineBold);
          setFmtItalic(!!hasInlineItalic);
          setFmtUL(!!ul);
          setFmtOL(!!ol);
          setFmtBlock((block || 'P').toUpperCase());
        } catch (e) {}
      }
      document.addEventListener('selectionchange', updateStates);
      return () => document.removeEventListener('selectionchange', updateStates);
    }, [richText]);

    // Fecha popovers ao clicar fora
    useEffect(() => {
      if (!richText) return;
      function onDocMouseDown(e: MouseEvent) {
        const t = e.target as Node | null;
        if (openHeading && headingRef.current && t && !headingRef.current.contains(t)) setOpenHeading(false);
        if (openMore && moreRef.current && t && !moreRef.current.contains(t)) setOpenMore(false);
      }
      document.addEventListener('mousedown', onDocMouseDown);
      return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [richText, openHeading, openMore]);

    function renderHTML(val: ComposerValue): string {
      const parts: string[] = [];
      if (val.decision) {
        const meta = CHIP_META[val.decision];
        parts.push(
          `<span class="decision-chip ${meta.className}" contenteditable="false" data-role="decision-chip">` +
            `<span class="decision-chip__label">${meta.label}</span>` +
            `<button type="button" class="decision-chip__close" data-role="decision-remove">` +
            `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` +
            `</button>` +
          `</span>`
        );
      }

      const textHTML = renderTextWithMentions(val.text, val.mentions);
      if (textHTML.length > 0) {
        parts.push(richText ? textHTML : `<span class="composer-text">${textHTML}</span>`);
      }
      return parts.join(" ");
    }

    function getCurrentValue(): ComposerValue {
      const root = rootRef.current;
      if (!root) return normalizeValue(DEFAULT_VALUE);
      const clone = root.cloneNode(true) as HTMLElement;
      const mentionNodes = Array.from(
        clone.querySelectorAll<HTMLElement>('[data-role="mention-chip"]')
      );
      const mentions: ComposerMention[] = mentionNodes.map((el) => {
        const rawLabel = el.getAttribute("data-label") || el.textContent || "";
        const label = rawLabel.replace(/^@/, "");
        const idAttr = el.getAttribute("data-id");
        // Preserva nomes completos no texto com NBSP para evitar quebra do chip fora do composer
        const safeLabel = label.replace(/ /g, "\u00A0");
        const textNode = document.createTextNode(`@${safeLabel}`);
        el.replaceWith(textNode);
        return {
          id: idAttr || undefined,
          label,
        };
      });
      clone
        .querySelectorAll('[contenteditable="false"]')
        .forEach((el) => el.remove());
      const text = sanitizeHTML(clone.innerHTML).trim();
      return {
        decision: valueState.decision,
        text,
        mentions,
      };
    }

    function applyStateToDOM(val: ComposerValue, options?: { skipCaret?: boolean }) {
      if (!rootRef.current) return;
      rootRef.current.innerHTML = renderHTML(val);
      if (!options?.skipCaret) {
        placeCaretAtEnd(rootRef.current);
      }
    }

    function handleInput() {
      const next = getCurrentValue();
      setValueState(next);
      detectTriggers();
    }

    function detectTriggers() {
      const root = rootRef.current;
      if (!root) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const preceding = getPrecedingText(root);

      let skipMentionDetection = false;
      if (mentionLockRef.current) {
        if (preceding.endsWith("@")) {
          mentionLockRef.current = false;
        } else {
          skipMentionDetection = true;
          onMentionClose?.();
        }
      }

      if (!skipMentionDetection) {
        const mentionMatch = preceding.match(/@([\w\s]*)$/);
        if (mentionMatch) {
          const rawQuery = mentionMatch[1] ?? "";
          const trimmedQuery = rawQuery.trim();
          const mentions = valueState.mentions ?? [];
          const matchedMention = mentions.find((m) =>
            trimmedQuery.toLowerCase().startsWith(m.label.toLowerCase())
          );
          const hasCompletedMention =
            matchedMention &&
            (preceding.endsWith(`@${matchedMention.label} `) ||
              preceding.endsWith(`@${matchedMention.label}`));

          if (matchedMention) {
            const labelLower = matchedMention.label.toLowerCase();
            const queryLower = trimmedQuery.toLowerCase();
            const extra = queryLower.slice(labelLower.length).trim();
            if (extra.length > 0) {
              onMentionClose?.();
              skipMentionDetection = true;
            }
          }

          if (!skipMentionDetection) {
            if (hasCompletedMention) {
              onMentionClose?.();
            } else {
              onMentionTrigger?.(rawQuery, rect);
            }
          }
        } else {
          onMentionClose?.();
        }
      }

      const commandMatch = preceding.match(/\/([\w]*)$/);
      if (commandMatch) {
        onCommandTrigger?.(commandMatch[1] || "", rect);
      } else {
        onCommandClose?.();
      }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (disabled) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const val = getCurrentValue();
        const hasDecision = !!val.decision;
        const hasText = val.text.trim().length > 0;
        if (!hasDecision && !hasText) return;
        onSubmit?.(val);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
        return;
      }

      if (e.key === "Backspace") {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (
            range.startContainer === rootRef.current &&
            range.startOffset === 0 &&
            valueState.decision
          ) {
            e.preventDefault();
            const next = { ...valueState, decision: null };
            setValueState(next);
            requestAnimationFrame(() => applyStateToDOM(next));
            return;
          }
        }
      }
    }

    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
      const target = e.target as HTMLElement;
      if (target?.dataset?.role === "decision-remove") {
        e.preventDefault();
        const next = { ...valueState, decision: null };
        setValueState(next);
        requestAnimationFrame(() => applyStateToDOM(next));
      }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      insertTextAtCursor(text);
      handleInput();
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault();
    }

    function insertTextAtCursor(text: string) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        if (rootRef.current) {
          rootRef.current.focus();
          document.execCommand("insertText", false, text);
        }
        return;
      }
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function placeCaretAtEnd(el: HTMLElement) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    function focusAfterMention(root: HTMLElement, mention: ComposerMention) {
      const chips = Array.from(root.querySelectorAll<HTMLElement>('[data-role="mention-chip"]'));
      if (chips.length === 0) {
        placeCaretAtEnd(root);
        return;
      }
      const expectedId = mention.id ?? null;
      const expectedLabel = mention.label;
      let target: HTMLElement | null = null;
      for (let idx = chips.length - 1; idx >= 0; idx -= 1) {
        const chip = chips[idx];
        const chipId = chip.getAttribute("data-id") || null;
        const chipLabel = (chip.getAttribute("data-label") || "").replace(/^@/, "");
        if (expectedId) {
          if (chipId === expectedId) {
            target = chip;
            break;
          }
        } else if (chipLabel === expectedLabel) {
          target = chip;
          break;
        }
      }
      if (!target) {
        target = chips[chips.length - 1] ?? null;
      }
      if (!target) {
        placeCaretAtEnd(root);
        return;
      }
      const parent = target.parentNode;
      if (!parent) {
        placeCaretAtEnd(root);
        return;
      }
      const existingSibling = target.nextSibling;
      let spaceNode: Text;
      if (existingSibling && existingSibling.nodeType === Node.TEXT_NODE) {
        spaceNode = existingSibling as Text;
        if (!spaceNode.data || spaceNode.data.length === 0) {
          spaceNode.data = " ";
        }
      } else {
        spaceNode = document.createTextNode(" ");
        parent.insertBefore(spaceNode, existingSibling);
      }
      const range = document.createRange();
      const offset = Math.min(1, spaceNode.data.length);
      range.setStart(spaceNode, offset);
      range.collapse(true);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    function getPrecedingText(root: HTMLElement): string {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return "";
      const range = selection.getRangeAt(0).cloneRange();
      range.collapse(true);
      range.setStart(root, 0);
      const fragment = range.cloneContents();
      const div = document.createElement("div");
      div.appendChild(fragment);
      return sanitizeHTML(div.innerHTML);
    }

    const showPlaceholder = valueState.text.length === 0 && !valueState.decision;

    return (
      <div className={clsx("composer-root", className)}>
        <div className="relative">
          {richText && (
            <div className="composer-toolbar absolute left-2 top-2 z-10 flex items-center">
              <div className="relative" ref={headingRef}>
                <button
                  type="button"
                  className="rt-btn rt-btn-dropdown"
                  onClick={() => setOpenHeading(v=>!v)}
                  aria-label="Estilos de texto"
                >
                  <span>Aa</span>
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                    className="rt-chevron"
                  >
                    <path 
                      d="M3 4.5L6 7.5L9 4.5" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {openHeading && (
                  <div className="absolute z-50 mt-2 w-44 rounded border border-zinc-200 bg-white shadow-lg">
                    {[
                      {label:'Texto normal', tag:'P'},
                      {label:'Título 1', tag:'H1'},
                      {label:'Título 2', tag:'H2'},
                      {label:'Título 3', tag:'H3'},
                      {label:'Título 4', tag:'H4'},
                    ].map(item => (
                      <button
                        key={item.tag}
                        onClick={() => {
                          try {
                            const tag = `<${item.tag}>`;
                            rootRef.current?.focus();
                            document.execCommand('formatBlock', false, tag);
                          } catch (e) {}
                          setFmtBlock(item.tag);
                          setOpenHeading(false);
                          rootRef.current?.focus();
                        }}
                        className={clsx('w-full text-left px-3 py-2 hover:bg-zinc-50 transition-colors', fmtBlock===item.tag ? 'bg-zinc-50 font-medium' : '')}
                      >{item.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <span className="rt-sep mx-2" aria-hidden />
              {/* Grupo: B I */}
              <button
                type="button"
                onClick={() => { try { document.execCommand('bold'); } catch (e) {}; rootRef.current?.focus(); }}
                className={clsx('rt-btn', fmtBold ? 'is-active' : '')}
                aria-pressed={fmtBold}
                aria-label="Negrito"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => { try { document.execCommand('italic'); } catch (e) {}; rootRef.current?.focus(); }}
                className={clsx('rt-btn rt-btn--italic', fmtItalic ? 'is-active' : '')}
                aria-pressed={fmtItalic}
                aria-label="Itálico"
              >
                <span style={{ fontStyle: 'italic', fontWeight: 700 }}>I</span>
              </button>
              <span className="rt-sep mx-2" aria-hidden />
              {/* Grupo: Mais */}
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  className="rt-btn rt-btn-dropdown rt-btn-list"
                  aria-label="Mais opções"
                  onClick={() => setOpenMore(v=>!v)}
                >
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none"
                    className="rt-list-icon"
                  >
                    <path 
                      d="M3 4.5H8M3 8H12M3 11.5H9" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                    className="rt-chevron"
                  >
                    <path 
                      d="M3 4.5L6 7.5L9 4.5" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {openMore && (
                  <div className="absolute z-50 mt-2 w-52 rounded border border-zinc-200 bg-white shadow-lg">
                    <div className="px-3 py-2 text-[12px] text-zinc-500">Formatação</div>
                    <button
                      className={clsx('flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-50 transition-colors', fmtUL ? 'bg-zinc-50 font-medium' : '')}
                      onClick={() => { try { document.execCommand('insertUnorderedList'); } catch (e) {}; setOpenMore(false); rootRef.current?.focus(); }}
                    >
                      <span>Lista com marcadores</span>
                    </button>
                    <button
                      className={clsx('flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-50 transition-colors', fmtOL ? 'bg-zinc-50 font-medium' : '')}
                      onClick={() => { try { document.execCommand('insertOrderedList'); } catch (e) {}; setOpenMore(false); rootRef.current?.focus(); }}
                    >
                      <span>Lista numerada</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div
            ref={rootRef}
            className={clsx("composer-input", { "composer-input-disabled": disabled })}
            style={richText ? { paddingTop: 50 } : undefined}
            role="textbox"
            aria-multiline="true"
            contentEditable={!disabled}
            data-placeholder={placeholder}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onClick={handleClick}
            onDrop={handleDrop}
          />
          {showPlaceholder && (
            <div
              className="composer-placeholder"
              aria-hidden="true"
              style={{ position: 'absolute', left: 16, top: richText ? 50 : 14, pointerEvents: 'none' }}
            >
              {placeholder}
            </div>
          )}
        </div>
      </div>
    );
  }
);

UnifiedComposer.displayName = "UnifiedComposer";
