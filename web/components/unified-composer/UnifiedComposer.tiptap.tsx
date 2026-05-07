"use client";

// Tiptap-based drop-in replacement for UnifiedComposer.
// Note: This file dynamically imports tiptap at runtime. If deps are not installed,
// it falls back to rendering a lightweight legacy-compatible surface that proxies events.

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import clsx from "clsx";

export type ComposerDecision = "aprovado" | "negado" | "reanalise";
export type ComposerMention = { id?: string | null; label: string };
export type ComposerValue = { decision: ComposerDecision | null; text: string; mentions?: ComposerMention[] };

export type UnifiedComposerHandle = {
  focus: () => void;
  setDecision: (decision: ComposerDecision | null) => void;
  insertText: (text: string) => void;
  insertMention: (mention: ComposerMention) => void;
  reset: () => void;
  setValue: (value: ComposerValue) => void;
  getSelectionRect: () => DOMRect | null;
};

type Props = {
  placeholder?: string;
  ariaLabel?: string;
  defaultValue?: ComposerValue;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  richText?: boolean;
  enablePasteAttachment?: boolean;
  enableDropAttachment?: boolean;
  onFilesDropped?: (files: File[]) => void;
  onFilesPasted?: (files: File[]) => void;
  onChange?: (value: ComposerValue) => void;
  onSubmit?: (value: ComposerValue) => void;
  onCancel?: () => void;
  onRequestDecision?: (decision: ComposerDecision) => void;
  onRequestAttachment?: () => void;
  onMentionTrigger?: (query: string, rect: DOMRect | null) => void;
  onMentionClose?: () => void;
  onCommandTrigger?: (query: string, rect: DOMRect | null) => void;
  onCommandClose?: () => void;
  onAcceptCommand?: (query: string) => boolean | Promise<boolean>;
  onAcceptMention?: (query: string) => boolean | Promise<boolean>;
};

function toValue(text: string, mentions?: ComposerMention[], decision: ComposerDecision | null = null): ComposerValue {
  return { decision, text, mentions: Array.isArray(mentions) ? mentions : [] };
}

function extractMentionsFromText(text: string): ComposerMention[] {
  if (!text) return [];
  const list: ComposerMention[] = [];
  const re = /@([^\s@]+(?:\u00A0[^\s@]+)*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    list.push({ label: (m[1] || "").replace(/\u00A0/g, " ") });
  }
  return list;
}

export default forwardRef<UnifiedComposerHandle, Props>(function UnifiedComposerTiptap(
  {
    placeholder,
    ariaLabel,
    defaultValue,
    disabled,
    autoFocus,
    className,
    richText,
    enablePasteAttachment,
    enableDropAttachment,
    onFilesDropped,
    onFilesPasted,
    onChange,
    onSubmit,
    onCancel,
    onMentionTrigger,
    onMentionClose,
    onCommandTrigger,
    onCommandClose,
    onAcceptCommand,
    onAcceptMention,
    onRequestAttachment,
  },
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const tiptapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [val, setVal] = useState<ComposerValue>(() => toValue(defaultValue?.text || "", defaultValue?.mentions || [], defaultValue?.decision ?? null));

  // Lazy load tiptap at runtime if available
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tiptap = await import("@tiptap/react");
        const StarterKit = (await import("@tiptap/starter-kit")).default;
        const Placeholder = (await import("@tiptap/extension-placeholder")).default;
        // Optional mention extension wiring can be added here; for now keep external popover behavior.
        if (!mounted) return;
        const { useEditor, EditorContent } = tiptap as any;
        // Build editor
        const editor = useEditor({
          extensions: [StarterKit, Placeholder.configure({ placeholder: placeholder || "Digite…" })],
          content: (defaultValue?.text || "").replace(/\n/g, "<br/>") || "",
          editable: !disabled,
          onUpdate: ({ editor }: any) => {
            const text = editor.getText();
            const mentions = extractMentionsFromText(text);
            const next = toValue(text, mentions, val.decision);
            setVal(next);
            onChange?.(next);
          },
          onSelectionUpdate: ({ editor }: any) => {
            try {
              const view: any = editor.view;
              const domSel = view?.domSelection ?? window.getSelection?.();
              const rect = domSel && domSel.rangeCount > 0 ? domSel.getRangeAt(0).getBoundingClientRect?.() : null;
              const textBefore = editor.state.doc.textBetween(0, editor.state.selection.from, "\n");
              const mentionMatch = textBefore.match(/@([\w\s]*)$/);
              if (mentionMatch) {
                onMentionTrigger?.(mentionMatch[1] ?? "", rect || null);
              } else {
                onMentionClose?.();
              }
              const cmdMatch = textBefore.match(/\/([\w]*)$/);
              if (cmdMatch) {
                onCommandTrigger?.(cmdMatch[1] ?? "", rect || null);
              } else {
                onCommandClose?.();
              }
            } catch {}
          },
        });
        (tiptapRef as any).current = { tiptap, EditorContent, editor };
        setLoaded(true);
      } catch (_e) {
        setLoaded(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    focus: () => {
      try { (tiptapRef.current?.editor as any)?.commands?.focus?.(); } catch {}
      hostRef.current?.focus();
    },
    setDecision: (decision) => {
      setVal((prev) => ({ ...prev, decision }));
    },
    insertText: (text) => {
      try { (tiptapRef.current?.editor as any)?.commands?.insertContent?.(text); } catch {}
    },
    insertMention: (mention) => {
      // Simple insert as text token; can be upgraded to a Mention node
      const label = (mention?.label || "").replace(/ /g, "\u00A0");
      try { (tiptapRef.current?.editor as any)?.commands?.insertContent?.(`@${label} `); } catch {}
    },
    reset: () => {
      setVal({ decision: null, text: "", mentions: [] });
      try { (tiptapRef.current?.editor as any)?.commands?.setContent?.(""); } catch {}
    },
    setValue: (value) => {
      const next = { decision: value.decision ?? null, text: value.text ?? "", mentions: value.mentions || [] };
      setVal(next);
      try { (tiptapRef.current?.editor as any)?.commands?.setContent?.((next.text || "").replace(/\n/g, "<br/>")); } catch {}
    },
    getSelectionRect: () => {
      try {
        const sel = window.getSelection?.();
        if (!sel || sel.rangeCount === 0) return null;
        const r = sel.getRangeAt(0);
        if (!r || r.getClientRects().length === 0) return null;
        return r.getBoundingClientRect();
      } catch { return null; }
    },
  }), [onChange, onCommandClose, onCommandTrigger, onMentionClose, onMentionTrigger]);

  const onKeyDown = async (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Accept open mention/command via callbacks to preserve existing UX
      const viewText = val.text || "";
      const before = viewText; // simplified; editor state text used above
      const m = before.match(/@([\w\s]*)$/);
      if (m && onAcceptMention) {
        const accepted = await onAcceptMention((m[1] || "").trim());
        if (accepted) return;
      }
      const c = before.match(/\/([\w]*)$/);
      if (c && onAcceptCommand) {
        const ok = await onAcceptCommand((c[1] || "").trim().toLowerCase());
        if (ok) return;
      }
      if ((val.text || "").trim().length === 0 && !val.decision) return;
      onSubmit?.(val);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    }
  };

  const showPlaceholder = (val.text || "").length === 0 && !val.decision;

  // Render legacy-compatible chrome and host Tiptap inside
  const tiptapReady = loaded && tiptapRef.current?.EditorContent && tiptapRef.current?.editor;
  const EditorContent = useMemo(() => tiptapRef.current?.EditorContent || (() => null), [tiptapReady]);

  return (
    <div className={clsx("composer-root", className)}>
      <div className="relative">
        {richText && (
          <div className="composer-toolbar absolute left-2 top-2 z-10 flex items-center">
            {/* Minimal toolbar placeholder to keep layout; rich toolbar can be mapped to tiptap commands later */}
            <button type="button" className="rt-btn" aria-label="Negrito" onClick={()=>{ try { (tiptapRef.current?.editor as any)?.chain?.().focus?.().toggleBold?.().run?.(); } catch {} }}>B</button>
            <button type="button" className="rt-btn rt-btn--italic" aria-label="Itálico" onClick={()=>{ try { (tiptapRef.current?.editor as any)?.chain?.().focus?.().toggleItalic?.().run?.(); } catch {} }}>
              <span style={{ fontStyle: 'italic', fontWeight: 700 }}>I</span>
            </button>
          </div>
        )}
        <div
          ref={hostRef}
          className={clsx("composer-input", { "composer-input-disabled": disabled })}
          style={richText ? { paddingTop: 50 } : undefined}
          role="textbox"
          aria-label={ariaLabel || placeholder || undefined}
          aria-multiline="true"
          onKeyDown={onKeyDown}
          onPaste={(e)=>{
            try {
              if (enablePasteAttachment) {
                const dt = (e as React.ClipboardEvent).clipboardData;
                const files = Array.from(dt?.files || []);
                const hasFile = files.length > 0 || Array.from(dt?.items || []).some((it) => it.kind === 'file');
                if (hasFile) {
                  e.preventDefault();
                  if (files.length > 0 && typeof onFilesPasted === 'function') onFilesPasted(files);
                  else if (typeof onRequestAttachment === 'function') onRequestAttachment();
                  return;
                }
              }
            } catch {}
          }}
          onDragOver={(e)=>{
            if (!enableDropAttachment) return;
            e.preventDefault();
            try { (e as any).dataTransfer.dropEffect = 'copy'; } catch {}
          }}
          onDrop={(e)=>{
            try {
              if (!enableDropAttachment) return;
              const dt = (e as React.DragEvent).dataTransfer as DataTransfer;
              const files = Array.from(dt?.files || []);
              const items = Array.from(dt?.items || []);
              const types = Array.from(dt?.types || []);
              const hasFile = files.length > 0 || items.some((it) => it.kind === 'file') || types.includes('Files');
              if (hasFile) {
                e.preventDefault();
                if (files.length > 0 && typeof onFilesDropped === 'function') onFilesDropped(files);
                else if (typeof onRequestAttachment === 'function') onRequestAttachment();
              }
            } catch { (e as any).preventDefault?.(); }
          }}
        >
          {tiptapReady ? <EditorContent editor={tiptapRef.current.editor} /> : (val.text || "")}
        </div>
        {showPlaceholder && (
          <div className="composer-placeholder" aria-hidden="true" style={{ position: 'absolute', left: 16, top: richText ? 50 : 14, pointerEvents: 'none' }}>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
});
