import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import clsx from "clsx";

export type ComposerDecision = "aprovado" | "negado" | "reanalise";

export type ComposerValue = {
  decision: ComposerDecision | null;
  text: string;
};

export type UnifiedComposerHandle = {
  focus: () => void;
  setDecision: (decision: ComposerDecision | null) => void;
  insertText: (text: string) => void;
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
    const [valueState, setValueState] = useState<ComposerValue>(defaultValue ?? DEFAULT_VALUE);

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

          const next = { decision, text: cleanText };
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
        reset: () => {
          const next = DEFAULT_VALUE;
          setValueState(next);
          applyStateToDOM(next);
          onChange?.(next);
        },
        setValue: (val) => {
          const next = val ?? DEFAULT_VALUE;
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
      [valueState, onRequestDecision, onChange]
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
      onChange?.(valueState);
    }, [valueState, onChange]);

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

      const text = val.text.replace(/\n/g, "<br/>");
      if (text.length > 0) {
        parts.push(`<span class="composer-text">${text}</span>`);
      }
      return parts.join(" ");
    }

    function getCurrentValue(): ComposerValue {
      const root = rootRef.current;
      if (!root) return DEFAULT_VALUE;
      const clone = root.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[contenteditable="false"]').forEach((el) => el.remove());
      const text = sanitizeHTML(clone.innerHTML).trim();
      return {
        decision: valueState.decision,
        text,
      };
    }

    function applyStateToDOM(val: ComposerValue) {
      if (!rootRef.current) return;
      rootRef.current.innerHTML = renderHTML(val);
      placeCaretAtEnd(rootRef.current);
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

      const mentionMatch = preceding.match(/@([\w\s]*)$/);
      if (mentionMatch) {
        onMentionTrigger?.(mentionMatch[1] || "", rect);
      } else {
        onMentionClose?.();
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
        <div
          ref={rootRef}
          className={clsx("composer-input", { "composer-input-disabled": disabled })}
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
          <div className="composer-placeholder" aria-hidden="true">
            {placeholder}
          </div>
        )}
      </div>
    );
  }
);

UnifiedComposer.displayName = "UnifiedComposer";

