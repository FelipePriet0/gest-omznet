"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { MoreHorizontal, Pin } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/ui/avatar";
import clsx from "clsx";
import { uploadAttachmentBatch, ATTACHMENT_MAX_SIZE, ATTACHMENT_ALLOWED_TYPES } from "@/features/attachments/upload";
import { getAttachmentUrl, removeAttachment, type CardAttachment } from "@/features/attachments/services";
import { FileUploadDropzone, AttachmentChip, PendingFileChip } from "@/components/ui/file-upload";
import { UnifiedComposer, type ComposerDecision, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import MentionDropdown from "@/components/mentions/MentionDropdown";
import type { ProfileLite } from "@/lib/profiles";
import { renderTextWithChips } from "@/utils/richText";
import { CmdDropdown } from "../components/CmdDropdown";
import { DecisionTag, decisionPlaceholder } from "../utils/decision";

type Note = { id: string; text: string; author_id?: string | null; author_name?: string; author_role?: string | null; created_at?: string; parent_id?: string | null; level?: number; deleted?: boolean; decision?: ComposerDecision | string | null };

function buildTree(activeNotes: Note[], allNotes: Note[]): Note[] {
  const normalizeText = (note: any) => {
    if (!note) return "";
    if (!note.decision) return note.text || "";
    const placeholder = decisionPlaceholder(note.decision as any);
    return note.text === placeholder ? "" : (note.text || "");
  };

  // Mapa completo incluindo deletados — usado para snapshot do pai no quote block
  const allById = new Map<string, any>();
  allNotes.forEach((n) => allById.set(n.id, { ...n, text: normalizeText(n) }));

  const byId = new Map<string, any>();
  activeNotes.forEach((n) => byId.set(n.id, { ...n, text: normalizeText(n), children: [] as any[] }));
  const roots: any[] = [];
  activeNotes.forEach((n) => {
    const node = byId.get(n.id)!;
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id).children.push(node);
    } else {
      // Pai foi deletado — preserva os dados dele como snapshot no filho
      if (n.parent_id && allById.has(n.parent_id)) {
        const deletedParent = allById.get(n.parent_id);
        node.deletedParentSnapshot = {
          author_name: deletedParent.author_name,
          text: deletedParent.text,
          decision: deletedParent.decision,
        };
      }
      roots.push(node);
    }
  });
  const sortFn = (a: any, b: any) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
  const sortTree = (arr: any[]) => {
    arr.sort(sortFn);
    arr.forEach((x) => sortTree(x.children));
  };
  sortTree(roots);
  return roots as any;
}

export function PareceresList({
  cardId,
  notes,
  attachments,
  profiles,
  applicantName,
  onReply,
  onEdit,
  onDelete,
  onDecisionChange,
  currentUserId,
  canWrite = true,
  onTypingChange,
  onAttachmentUploaded,
  onPinnedChange,
}: {
  cardId: string;
  notes: Note[];
  attachments?: CardAttachment[];
  profiles: ProfileLite[];
  applicantName?: string | null;
  onReply: (parentId: string, value: ComposerValue) => Promise<string | null>;
  onEdit: (id: string, value: ComposerValue) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onDecisionChange: (decision: ComposerDecision | null) => Promise<void>;
  currentUserId?: string | null;
  canWrite?: boolean;
  onTypingChange?: (typing: boolean) => void;
  onAttachmentUploaded?: () => void;
  onPinnedChange?: (active: boolean, height: number) => void;
}) {
  // Estado otimista: pareceres deletados localmente (antes da confirmação do backend)
  const [optimisticallyDeleted, setOptimisticallyDeleted] = useState<Set<string>>(new Set());
  const [optimisticallyEdited, setOptimisticallyEdited] = useState<Map<string, Partial<Note>>>(new Map());
  
  // Incluir todas as notas; deletadas (backend + otimista) ficam marcadas como deleted: true
  const filteredNotes = useMemo(() => {
    return (notes || []).map((n) => {
      const isDeleted = n.deleted || optimisticallyDeleted.has(n.id);
      if (isDeleted) return { ...n, deleted: true };
      const edit = optimisticallyEdited.get(n.id);
      return edit ? { ...n, ...edit } : n;
    });
  }, [notes, optimisticallyDeleted, optimisticallyEdited]);
  
  const tree = useMemo(() => buildTree(filteredNotes, notes || []), [filteredNotes, notes]);
  
  // Resetar estado otimista quando os dados do hook mudarem (sincronização)
  useEffect(() => {
    setOptimisticallyDeleted(new Set());
    setOptimisticallyEdited(new Map());
  }, [notes]);
  
  // Wrapper otimista para onDelete
  const handleDeleteOptimistic = async (id: string) => {
    // 1. OTIMISTA: Remove imediatamente da UI
    setOptimisticallyDeleted((prev) => new Set(prev).add(id));
    
    try {
      // 2. Enviar requisição em background
      await onDelete(id);
      // 3. SUCESSO: O refreshCardSnapshot vai atualizar e limpar o estado otimista
    } catch (err: any) {
      // 4. REVERTER se falhar
      setOptimisticallyDeleted((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw err; // Re-throw para o componente pai tratar o erro
    }
  };
  
  // Wrapper otimista para onEdit
  const handleEditOptimistic = async (id: string, value: ComposerValue) => {
    // 1. OTIMISTA: Atualiza imediatamente na UI
    const text = (value.text || '').trim();
    const hasDecision = !!value.decision;
    const payloadText = hasDecision && !text ? decisionPlaceholder(value.decision ?? null) : text;
    
    setOptimisticallyEdited((prev) => {
      const next = new Map(prev);
      next.set(id, { text: payloadText, decision: value.decision ?? null });
      return next;
    });
    
    try {
      // 2. Enviar requisição em background
      await onEdit(id, value);
      // 3. SUCESSO: O refreshCardSnapshot vai atualizar e limpar o estado otimista
    } catch (err: any) {
      // 4. REVERTER se falhar
      setOptimisticallyEdited((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      throw err; // Re-throw para o componente pai tratar o erro
    }
  };
  
  const { open } = useSidebar();
  const [pinned, setPinned] = useState<any | null>(null);
  const [pinnedHeight, setPinnedHeight] = useState(120);
  const [isResizing, setIsResizing] = useState(false);
  const [leftOffset, setLeftOffset] = useState(0);

  useEffect(() => {
    const update = () => {
      const isDesktop = window.innerWidth >= 768;
      setLeftOffset(isDesktop ? (open ? 300 : 60) : 0);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newH = window.innerHeight - e.clientY;
      setPinnedHeight(Math.max(80, Math.min(window.innerHeight * 0.6, newH)));
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    onPinnedChange?.(!!pinned, pinned ? pinnedHeight : 0);
  }, [pinned, pinnedHeight, onPinnedChange]);

  return (
    <>
    <div className="space-y-2">
      {(!filteredNotes || filteredNotes.length === 0) && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
      {tree.map((n) => (
        <NoteItem
          key={n.id}
          cardId={cardId}
          node={n as any}
          depth={0}
          parentNote={
            (n as any).deletedParentSnapshot
              ? {
                  ...(n as any).deletedParentSnapshot,
                  attachmentNames: (attachments || [])
                    .filter((a) => a.note_id === n.parent_id)
                    .map((a) => a.file_name),
                }
              : null
          }
          attachments={attachments}
          profiles={profiles}
          onReply={onReply}
          onEdit={handleEditOptimistic}
          onDelete={handleDeleteOptimistic}
          onDecisionChange={onDecisionChange}
          applicantName={applicantName}
          currentUserId={currentUserId}
          canWrite={canWrite}
          onTypingChange={onTypingChange}
          onAttachmentUploaded={onAttachmentUploaded}
          pinned={pinned}
          onPin={setPinned}
        />
      ))}
    </div>
    {pinned && (
      <div className="fixed bottom-0 z-40 pointer-events-none" style={{ left: leftOffset, right: 0, height: `${pinnedHeight}px` }}>
        <div className="pointer-events-auto border-t border-zinc-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] w-full h-full flex flex-col">
          <div
            className={`w-full h-2 cursor-ns-resize flex items-center justify-center border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${isResizing ? "bg-zinc-100" : ""}`}
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
          >
            <div className="w-12 h-1 bg-zinc-300 rounded-full" />
          </div>
          <div className="px-4 py-3 text-xs text-zinc-600 flex items-center justify-between border-b border-zinc-100 shrink-0">
            <div className="min-w-0 flex items-center gap-2 truncate">
              <span className="font-medium text-zinc-800">{pinned.author_name || "—"}</span>
              <span className="text-zinc-500">{pinned.created_at ? new Date(pinned.created_at).toLocaleString() : ""}</span>
            </div>
            <button onClick={() => setPinned(null)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 transition-colors shrink-0">
              <Pin className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Desafixar</span>
            </button>
          </div>
          <div className="px-4 py-3 text-sm text-zinc-800 break-words overflow-y-auto flex-1">
            {pinned.decision && <div className="mb-2"><span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">{pinned.decision}</span></div>}
            {renderTextWithChips(pinned.text)}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

const ATTACHMENT_ACCEPT = Object.fromEntries(ATTACHMENT_ALLOWED_TYPES.map((t) => [t, []]));


function NoteItem({
  cardId,
  node,
  depth,
  parentNote,
  attachments,
  profiles,
  onReply,
  onEdit,
  onDelete,
  onDecisionChange,
  applicantName,
  currentUserId,
  canWrite,
  onTypingChange,
  onAttachmentUploaded,
  pinned,
  onPin,
}: {
  cardId: string;
  node: any;
  depth: number;
  parentNote?: { author_name?: string; text?: string; decision?: any; attachmentNames?: string[] } | null;
  attachments?: CardAttachment[];
  profiles: ProfileLite[];
  onReply: (parentId: string, value: ComposerValue) => Promise<string | null>;
  onEdit: (id: string, value: ComposerValue) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onDecisionChange: (decision: ComposerDecision | null) => Promise<void>;
  applicantName?: string | null;
  currentUserId?: string | null;
  canWrite?: boolean;
  onTypingChange?: (typing: boolean) => void;
  onAttachmentUploaded?: () => void;
  pinned?: any;
  onPin?: (note: any) => void;
}) {
  const replyComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const editComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);
  const replyRef = useRef<HTMLDivElement | null>(null);
  const replyAttachInputRef = useRef<HTMLInputElement | null>(null);
  const editAttachInputRef = useRef<HTMLInputElement | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [editPendingFiles, setEditPendingFiles] = useState<File[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleDropOnReply = (dropped: File[]) => {
    if (dropped.length === 0) return;
    const tooBig = dropped.find((f) => f.size > ATTACHMENT_MAX_SIZE);
    if (tooBig) { alert(`"${tooBig.name}" excede ${(ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`); return; }
    const invalid = dropped.find((f) => f.type && !ATTACHMENT_ALLOWED_TYPES.includes(f.type));
    if (invalid) { alert(`Tipo "${invalid.type || invalid.name}" não permitido.`); return; }
    setReplyPendingFiles((prev) => [...prev, ...dropped]);
  };

  const handleDropOnEdit = (dropped: File[]) => {
    if (dropped.length === 0) return;
    const tooBig = dropped.find((f) => f.size > ATTACHMENT_MAX_SIZE);
    if (tooBig) { alert(`"${tooBig.name}" excede ${(ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`); return; }
    const invalid = dropped.find((f) => f.type && !ATTACHMENT_ALLOWED_TYPES.includes(f.type));
    if (invalid) { alert(`Tipo "${invalid.type || invalid.name}" não permitido.`); return; }
    setEditPendingFiles((prev) => [...prev, ...dropped]);
  };

  const handleRemoveAttachment = async (id: string) => {
    setRemovingId(id);
    try {
      await removeAttachment(id);
      onAttachmentUploaded?.();
    } catch (e: any) {
      alert(e?.message || "Falha ao remover anexo");
    } finally {
      setRemovingId(null);
    }
  };
  const [replyValue, setReplyValue] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [replyPendingFiles, setReplyPendingFiles] = useState<File[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState("");
  // Mention state for reply composer
  const [replyMentionOpen, setReplyMentionOpen] = useState(false);
  const [replyMentionFilter, setReplyMentionFilter] = useState("");
  const [replyMentionAnchor, setReplyMentionAnchor] = useState<{top:number;left:number;height:number}|null>(null);
  // Mention state for edit composer
  const [editMentionOpen, setEditMentionOpen] = useState(false);
  const [editMentionFilter, setEditMentionFilter] = useState("");
  const [editMentionAnchor, setEditMentionAnchor] = useState<{top:number;left:number;height:number}|null>(null);
  const canReply = !!canWrite;
  const canEdit = !!canWrite && currentUserId && node.author_id && currentUserId === node.author_id;
  const canDelete = !!currentUserId && node.author_id && currentUserId === node.author_id;

  useEffect(() => {
    const onOpenAttach = (e: any) => {
      // apenas marcador; o modal raiz escuta e abre input hidden
    };
    window.addEventListener("mz-open-attach", onOpenAttach as any);
    return () => window.removeEventListener("mz-open-attach", onOpenAttach as any);
  }, []);

  const trimmedText = (node.text || "").trim();
  const noteAttachments = (attachments || []).filter((a) => a.note_id === node.id);
  const isRoot = depth === 0;

  useEffect(() => {
    if (canReply) return;
    setIsReplying(false);
    setCmdOpen(false);
  }, [canReply]);

  useEffect(() => {
    if (canEdit) return;
    setIsEditing(false);
    setEditCmdOpen(false);
  }, [canEdit]);


  return (
    <div
      className={isRoot ? "rounded-[2px] border border-zinc-400 bg-blue-100 text-sm text-zinc-800 overflow-hidden" : ""}
      style={isRoot ? { borderLeftColor: 'var(--verde-primario)', borderLeftWidth: '8px' } : {}}
    >
    <div className="px-3 py-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserAvatar name={node.author_name || "?"} size={isRoot ? "sm" : "xs"} />
          <div className="leading-tight min-w-0">
            <div className="text-sm font-medium text-zinc-900 truncate">{node.author_name || "—"}</div>
            <div className="text-[11px] text-zinc-500">{new Date(node.created_at || "").toLocaleString()}</div>
            {node.author_role && (
              <div className="text-[11px] text-zinc-500 truncate">{node.author_role}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!node.deleted && (<>
          {onPin && (
            <button
              aria-label="Fixar parecer"
              onClick={() => onPin(pinned?.id === node.id ? null : node)}
              className={clsx("p-1 rounded hover:bg-zinc-100 transition-colors", pinned?.id === node.id ? "text-amber-700" : "text-zinc-500 hover:text-zinc-700")}
            >
              <Pin className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
          <button
            aria-label="Responder"
            disabled={!canReply}
            aria-disabled={!canReply}
            onClick={() => {
              if (!canReply) return;
              setIsReplying((next) => {
                const initial: ComposerValue = { decision: null, text: "", mentions: [] };
                if (!next) {
                  setReplyValue(initial);
                  requestAnimationFrame(() => {
                    replyComposerRef.current?.setValue(initial);
                    replyComposerRef.current?.focus();
                  });
                }
                return !next;
              });
            }}
            className={clsx(
              "text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100",
              !canReply && "cursor-not-allowed opacity-50 hover:text-zinc-500 hover:bg-transparent"
            )}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M4 12h16M12 4l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {(canEdit || canDelete) && currentUserId && node.author_id && node.author_id === currentUserId ? (
            <ParecerMenu
              onEdit={
                canEdit
                  ? () => {
                      const initial: ComposerValue = { decision: (node.decision as ComposerDecision | null) ?? null, text: node.text || "", mentions: [] };
                      setEditValue(initial);
                      setIsEditing(true);
                      requestAnimationFrame(() => {
                        editComposerRef.current?.setValue(initial);
                        editComposerRef.current?.focus();
                      });
                    }
                  : undefined
              }
              onDelete={
                canDelete
                  ? async () => {
                      if (confirm("Excluir este parecer?")) {
                        try {
                          await onDelete(node.id);
                        } catch (e: any) {
                          alert(e?.message || "Falha ao excluir parecer");
                        }
                      }
                    }
                  : undefined
              }
            />
          ) : null}
          </>)}
        </div>
      </div>

      {/* Quote block (WhatsApp-style) */}
      {parentNote && (
        <div className="mt-2 flex overflow-hidden rounded-sm" style={{ borderLeft: '3px solid var(--verde-primario)' }}>
          <div className="bg-blue-200/50 px-2 py-1 min-w-0 flex-1">
            <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--verde-primario)' }}>
              {parentNote.author_name || '—'}
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              {(parentNote.text || '').trim()
                || (parentNote.attachmentNames?.[0] ? `📎 ${parentNote.attachmentNames[0]}` : '…')}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {node.deleted ? (
        <div className="mt-1 flex items-center gap-1.5 text-zinc-400 italic text-sm select-none">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="9"/>
            <path d="M4.93 4.93L19.07 19.07"/>
          </svg>
          <span>Mensagem apagada para todos</span>
        </div>
      ) : !isEditing ? (
        <div className="mt-1 space-y-2">
          {node.decision ? <DecisionTag decision={node.decision} /> : null}
          {trimmedText.length > 0 && <div className="break-words">{renderTextWithChips(node.text)}</div>}
        </div>
      ) : (
        <FileUploadDropzone
          onFiles={handleDropOnEdit}
          disabled={!canEdit}
          accept={ATTACHMENT_ACCEPT}
          className="mt-2"
        >
        <div ref={editRef}>
          <div className="relative">
            <button
              type="button"
              aria-label="Descartar alterações"
              onClick={() => {
                setIsEditing(false);
                setEditCmdOpen(false);
                onTypingChange?.(false);
              }}
              className="absolute top-2 right-2 z-10 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded p-1 transition-colors"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <UnifiedComposer
              ref={editComposerRef}
              className="composer-root--blue"
              defaultValue={editValue}
              disabled={!canEdit}
              placeholder="Edite o parecer… Use @ para mencionar e / para comandos"
              ariaLabel="Editar parecer"
              richText
              hasPendingAttachments={editPendingFiles.length > 0}
              onAcceptMention={(query) => {
                const list = profiles.filter((p) => (p.full_name || '').toLowerCase().includes((query || '').toLowerCase()));
                if (list.length === 1) {
                  editComposerRef.current?.insertMention({ id: list[0].id, label: list[0].full_name });
                  setEditMentionOpen(false);
                  setEditMentionFilter('');
                  return true;
                }
                return false;
              }}
              onAcceptCommand={(query) => {
                const opts = ['aprovado','negado','reanalise','anexo'].filter(k => k.includes((query||'').toLowerCase()));
                if (opts.length === 1) {
                  setEditCmdOpen(false); setEditCmdQuery('');
                  if (opts[0] === 'anexo') {
                    editAttachInputRef.current?.click();
                    const cleanText = editValue.text.replace(/\s*\/[\w]*$/, '').trimEnd();
                    const next = { ...editValue, text: cleanText };
                    setEditValue(next);
                    editComposerRef.current?.setValue(next);
                  } else {
                    editComposerRef.current?.setDecision(opts[0] as any);
                  }
                  return true;
                }
                return false;
              }}
              onChange={(val) => { setEditValue(val); onTypingChange?.(true); }}
              onSubmit={
                !canEdit
                  ? undefined
                  : async (val) => {
                      const trimmed = (val.text || "").trim();
                      const hasDecision = !!val.decision;
                      if (!hasDecision && !trimmed && editPendingFiles.length === 0) return;
                      const payloadText = hasDecision && !trimmed ? decisionPlaceholder(val.decision ?? null) : trimmed;
                      const filesToUpload = editPendingFiles.slice();
                      if (filesToUpload.length > 0) setEditPendingFiles([]);
                      setIsEditing(false);
                      setEditCmdOpen(false);
                      onTypingChange?.(false);
                      try {
                        await onEdit(node.id, { ...val, text: payloadText });
                        if (filesToUpload.length > 0) {
                          try {
                            await uploadAttachmentBatch({ cardId, noteId: node.id, files: filesToUpload.map((f) => ({ file: f })) });
                            onAttachmentUploaded?.();
                          } catch (uploadErr: any) {
                            console.error("Falha ao enviar anexos do edit", uploadErr);
                          }
                        }
                        if (val.decision === "aprovado" || val.decision === "negado") {
                          await onDecisionChange(val.decision);
                        } else if (val.decision === "reanalise") {
                          await onDecisionChange("reanalise");
                        }
                      } catch (e: any) {
                        setIsEditing(true);
                        if (filesToUpload.length > 0) setEditPendingFiles(filesToUpload);
                        alert(e?.message || "Falha ao editar parecer");
                      }
                    }
              }
              onCancel={() => {
                setIsEditing(false);
                setEditCmdOpen(false);
                onTypingChange?.(false);
              }}
              onCommandTrigger={
                !canEdit
                  ? undefined
                  : (query) => {
                      setEditCmdQuery(query.toLowerCase());
                      setEditCmdOpen(true);
                    }
              }
              onMentionTrigger={(query, rect) => {
                setEditMentionFilter((query || '').trim());
                if (rect && editRef.current) {
                  const host = editRef.current.getBoundingClientRect();
                  const top = (rect.bottom ?? (rect.top + (rect.height||0))) - host.top;
                  const left = (rect.left ?? host.left) - host.left;
                  setEditMentionAnchor({ top, left, height: rect.height });
                }
                setEditMentionOpen(true);
              }}
              onMentionClose={() => setEditMentionOpen(false)}
              onCommandClose={() => {
                setEditCmdOpen(false);
                setEditCmdQuery("");
              }}
            />
            {editMentionOpen && (
              <div className="absolute z-50" style={{ left: Math.max(0, (editMentionAnchor?.left||0)), top: Math.max(0, (editMentionAnchor?.top||0)) }}>
                <MentionDropdown
                  items={profiles.filter((p) => p.id !== currentUserId && p.full_name.toLowerCase().includes(editMentionFilter.toLowerCase()))}
                  onPick={(p) => {
                    editComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                    setEditMentionOpen(false);
                    setEditMentionFilter("");
                  }}
                />
              </div>
            )}
            {canEdit && editCmdOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <CmdDropdown
                  items={[
                    { key: "aprovado", label: "Aprovado" },
                    { key: "negado", label: "Negado" },
                    { key: "reanalise", label: "Reanálise" },
                    { key: "anexo", label: "Anexo" },
                  ].filter((i) => i.key.includes(editCmdQuery) || i.label.toLowerCase().includes(editCmdQuery))}
                  onPick={async (key) => {
                    setEditCmdOpen(false);
                    setEditCmdQuery("");
                    if (key === "aprovado" || key === "negado" || key === "reanalise") {
                      editComposerRef.current?.setDecision(key as any);
                      return;
                    }
                    if (key === "anexo") {
                      editAttachInputRef.current?.click();
                      const cleanText = editValue.text.replace(/\s*\/[\w]*$/, '').trimEnd();
                      const next = { ...editValue, text: cleanText };
                      setEditValue(next);
                      editComposerRef.current?.setValue(next);
                      return;
                    }
                  }}
                  initialQuery={editCmdQuery}
                />
              </div>
            )}
          </div>
          <input
            ref={editAttachInputRef}
            type="file"
            multiple
            className="hidden"
            accept={ATTACHMENT_ALLOWED_TYPES.join(",")}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              const tooBig = files.find((f) => f.size > ATTACHMENT_MAX_SIZE);
              if (tooBig) { alert(`"${tooBig.name}" excede ${(ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`); return; }
              const invalid = files.find((f) => f.type && !ATTACHMENT_ALLOWED_TYPES.includes(f.type));
              if (invalid) { alert(`Tipo "${invalid.type || invalid.name}" não permitido.`); return; }
              setEditPendingFiles((prev) => [...prev, ...files]);
              requestAnimationFrame(() => editComposerRef.current?.focus());
            }}
          />
          {editPendingFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {editPendingFiles.map((f, i) => (
                <PendingFileChip
                  key={i}
                  file={f}
                  onRemove={() => setEditPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}
        </div>
        </FileUploadDropzone>
      )}

      {/* Attachment chips */}
      {!node.deleted && noteAttachments.length > 0 && (
        <div className="mt-2 space-y-1">
          {noteAttachments.map((att) => (
            <AttachmentChip
              key={att.id}
              name={att.file_name}
              fileType={att.file_type}
              fileExt={att.file_extension}
              fileSize={att.file_size}
              createdAt={att.created_at}
              removing={removingId === att.id}
              onClick={async () => {
                const url = await getAttachmentUrl(att.id);
                if (url) window.open(url, "_blank");
              }}
              onRemove={canWrite ? () => handleRemoveAttachment(att.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Reply */}
      {!node.deleted && canReply && isReplying && (
        <FileUploadDropzone
          onFiles={handleDropOnReply}
          accept={ATTACHMENT_ACCEPT}
          className="mt-2"
        >
        <div ref={replyRef}>
          <div className="relative">
            <UnifiedComposer
              ref={replyComposerRef}
              className="composer-root--blue"
              placeholder="Responder… Use @ para mencionar e / para comandos"
              ariaLabel="Responder parecer"
              richText
              hasPendingAttachments={replyPendingFiles.length > 0}
              onAcceptMention={(query) => {
                const list = profiles.filter((p) => p.id !== currentUserId && (p.full_name || '').toLowerCase().includes((query || '').toLowerCase()));
                if (list.length === 1) {
                  replyComposerRef.current?.insertMention({ id: list[0].id, label: list[0].full_name });
                  setReplyMentionOpen(false);
                  setReplyMentionFilter('');
                  return true;
                }
                return false;
              }}
              onAcceptCommand={(query) => {
                const opts = ['aprovado','negado','reanalise','anexo'].filter(k => k.includes((query||'').toLowerCase()));
                if (opts.length === 1) {
                  setCmdOpen(false); setCmdQuery('');
                  if (opts[0] === 'anexo') {
                    replyAttachInputRef.current?.click();
                    const cleanText = replyValue.text.replace(/\s*\/[\w]*$/, '').trimEnd();
                    const next = { ...replyValue, text: cleanText };
                    setReplyValue(next);
                    replyComposerRef.current?.setValue(next);
                  } else {
                    replyComposerRef.current?.setDecision(opts[0] as any);
                  }
                  return true;
                }
                return false;
              }}
              onChange={(val) => { setReplyValue(val); onTypingChange?.(true); }}
              onSubmit={async (val) => {
                const txt = (val.text || "").trim();
                const hasDecision = !!val.decision;
                if (!hasDecision && !txt && replyPendingFiles.length === 0) return;
                const payloadText = hasDecision && !txt ? decisionPlaceholder(val.decision ?? null) : txt;
                const filesToUpload = replyPendingFiles.slice();
                if (filesToUpload.length > 0) setReplyPendingFiles([]);
                setIsReplying(false);
                setReplyValue({ decision: null, text: "", mentions: [] });
                setCmdOpen(false);
                onTypingChange?.(false);
                try {
                  const noteId = await onReply(node.id, { ...val, text: payloadText });
                  if (filesToUpload.length > 0 && noteId) {
                    try {
                      await uploadAttachmentBatch({
                        cardId,
                        noteId,
                        files: filesToUpload.map((f) => ({ file: f })),
                      });
                      onAttachmentUploaded?.();
                    } catch (uploadErr: any) {
                      console.error('Falha ao enviar anexos da resposta', uploadErr);
                    }
                  }
                  if (val.decision === "aprovado" || val.decision === "negado") {
                    await onDecisionChange(val.decision);
                  } else if (val.decision === "reanalise") {
                    await onDecisionChange("reanalise");
                  }
                } catch (e: any) {
                  setIsReplying(true);
                  if (filesToUpload.length > 0) setReplyPendingFiles(filesToUpload);
                  alert(e?.message || "Falha ao responder");
                }
              }}
              onCancel={() => {
                setIsReplying(false);
                setCmdOpen(false);
                onTypingChange?.(false);
              }}
              onCommandTrigger={(query) => {
                setCmdQuery(query.toLowerCase());
                setCmdOpen(true);
              }}
              onMentionTrigger={(query, rect) => {
                setReplyMentionFilter((query || '').trim());
                if (rect && replyRef.current) {
                  const host = replyRef.current.getBoundingClientRect();
                  const top = (rect.bottom ?? (rect.top + (rect.height||0))) - host.top;
                  const left = (rect.left ?? host.left) - host.left;
                  setReplyMentionAnchor({ top, left, height: rect.height });
                }
                setReplyMentionOpen(true);
              }}
              onMentionClose={() => setReplyMentionOpen(false)}
              onCommandClose={() => {
                setCmdOpen(false);
                setCmdQuery("");
              }}
            />
            {replyMentionOpen && (
              <div className="absolute z-50" style={{ left: Math.max(0, (replyMentionAnchor?.left||0)), top: Math.max(0, (replyMentionAnchor?.top||0)) }}>
                <MentionDropdown
                  items={profiles.filter((p) => p.id !== currentUserId && p.full_name.toLowerCase().includes(replyMentionFilter.toLowerCase()))}
                  onPick={(p) => {
                    replyComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                    setReplyMentionOpen(false);
                    setReplyMentionFilter("");
                  }}
                />
              </div>
            )}
            {cmdOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <CmdDropdown
                  items={[
                    { key: "aprovado", label: "Aprovado" },
                    { key: "negado", label: "Negado" },
                    { key: "reanalise", label: "Reanálise" },
                    { key: "anexo", label: "Anexo" },
                  ].filter((i) => i.key.includes(cmdQuery) || i.label.toLowerCase().includes(cmdQuery))}
                  onPick={async (key) => {
                    setCmdOpen(false);
                    setCmdQuery("");
                    if (key === "aprovado" || key === "negado" || key === "reanalise") {
                      replyComposerRef.current?.setDecision(key as any);
                      return;
                    }
                    if (key === "anexo") {
                      replyAttachInputRef.current?.click();
                      const cleanText = replyValue.text.replace(/\s*\/[\w]*$/, '').trimEnd();
                      const next = { ...replyValue, text: cleanText };
                      setReplyValue(next);
                      replyComposerRef.current?.setValue(next);
                      return;
                    }
                  }}
                  initialQuery={cmdQuery}
                />
              </div>
            )}
          </div>
          <input
            ref={replyAttachInputRef}
            type="file"
            multiple
            className="hidden"
            accept={ATTACHMENT_ALLOWED_TYPES.join(",")}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              const tooBig = files.find((f) => f.size > ATTACHMENT_MAX_SIZE);
              if (tooBig) { alert(`"${tooBig.name}" excede ${(ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(0)}MB.`); return; }
              const invalid = files.find((f) => f.type && !ATTACHMENT_ALLOWED_TYPES.includes(f.type));
              if (invalid) { alert(`Tipo "${invalid.type || invalid.name}" não permitido.`); return; }
              setReplyPendingFiles((prev) => [...prev, ...files]);
              requestAnimationFrame(() => replyComposerRef.current?.focus());
            }}
          />
          {replyPendingFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {replyPendingFiles.map((f, i) => (
                <PendingFileChip
                  key={i}
                  file={f}
                  onRemove={() => setReplyPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}
        </div>
        </FileUploadDropzone>
      )}

    </div>
    {node.children && node.children.length > 0 && (
      <div className="border-t border-zinc-300">
        {node.children.map((c: any) => (
          <NoteItem
            key={c.id}
            cardId={cardId}
            node={c}
            depth={depth + 1}
            parentNote={{
              author_name: node.author_name,
              text: node.text,
              decision: node.decision,
              attachmentNames: (attachments || [])
                .filter((a) => a.note_id === node.id)
                .map((a) => a.file_name),
            }}
            attachments={attachments}
            profiles={profiles}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onDecisionChange={onDecisionChange}
            applicantName={applicantName}
            currentUserId={currentUserId}
            canWrite={canWrite}
            onTypingChange={onTypingChange}
            onAttachmentUploaded={onAttachmentUploaded}
            pinned={pinned}
            onPin={onPin}
          />
        ))}
      </div>
    )}
    </div>
  );
}

// MentionDropdown now shared in @/components/mentions/MentionDropdown

function ParecerMenu({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void | Promise<void> }) {
  if (!onEdit && !onDelete) return null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const handleToggle = () => {
    if (!menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMenuOpen((v) => !v);
  };

  return (
    <div>
      <button ref={btnRef} aria-label="Mais ações" className="parecer-menu-trigger p-2 rounded-full hover:bg-zinc-100 transition-colors" onClick={handleToggle}>
        <MoreHorizontal className="w-4 h-4 text-zinc-600" strokeWidth={2} />
      </button>
      {menuOpen && menuPos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
          <div
            className="parecer-menu-dropdown fixed z-[9999] w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 overflow-hidden"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            {onEdit && (
              <button className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors duração-150" onClick={() => { setMenuOpen(false); onEdit(); }}>
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
            )}
            {onEdit && onDelete ? <div className="h-px bg-zinc-100 mx-2" /> : null}
            {onDelete && (
              <button className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duração-150" onClick={async () => { setMenuOpen(false); await onDelete(); }}>
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Excluir
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
