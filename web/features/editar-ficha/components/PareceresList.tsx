"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { MoreHorizontal, User as UserIcon, Paperclip, X } from "lucide-react";
import clsx from "clsx";
import { uploadAttachmentBatch, ATTACHMENT_MAX_SIZE, ATTACHMENT_ALLOWED_TYPES } from "@/features/attachments/upload";
import { getAttachmentUrl, type CardAttachment } from "@/features/attachments/services";
import { UnifiedComposer, type ComposerDecision, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import MentionDropdown from "@/components/mentions/MentionDropdown";
import { TaskCard } from "@/features/tasks/TaskCard";
import type { CardTask } from "@/features/tasks/services";
import type { ProfileLite } from "@/features/comments/services";
import { renderTextWithChips } from "@/utils/richText";
import { CmdDropdown } from "../components/CmdDropdown";
import { DecisionTag, decisionPlaceholder } from "../utils/decision";

type Note = { id: string; text: string; author_id?: string | null; author_name?: string; author_role?: string | null; created_at?: string; parent_id?: string | null; level?: number; deleted?: boolean; decision?: ComposerDecision | string | null };

function buildTree(notes: Note[]): Note[] {
  // Filtrar pareceres deletados (soft delete do backend)
  const activeNotes = notes.filter((n) => !n.deleted);
  
  const byId = new Map<string, any>();
  const normalizeText = (note: any) => {
    if (!note) return "";
    if (!note.decision) return note.text || "";
    const placeholder = decisionPlaceholder(note.decision as any);
    return note.text === placeholder ? "" : (note.text || "");
  };
  activeNotes.forEach((n) => byId.set(n.id, { ...n, text: normalizeText(n), children: [] as any[] }));
  const roots: any[] = [];
  activeNotes.forEach((n) => {
    const node = byId.get(n.id)!;
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id).children.push(node);
    else roots.push(node);
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
  tasks,
  applicantName,
  onReply,
  onEdit,
  onDelete,
  onDecisionChange,
  onOpenTask,
  onToggleTask,
  currentUserId,
  canWrite = true,
  onTypingChange,
}: {
  cardId: string;
  notes: Note[];
  attachments?: CardAttachment[];
  profiles: ProfileLite[];
  tasks: CardTask[];
  applicantName?: string | null;
  onReply: (parentId: string, value: ComposerValue) => Promise<string | null>;
  onEdit: (id: string, value: ComposerValue) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onDecisionChange: (decision: ComposerDecision | null) => Promise<void>;
  onOpenTask: (context: { parentId?: string | null; taskId?: string | null; source?: "parecer" | "conversa" }) => void;
  onToggleTask: (taskId: string, done: boolean) => Promise<void> | void;
  currentUserId?: string | null;
  canWrite?: boolean;
  onTypingChange?: (typing: boolean) => void;
}) {
  // Estado otimista: pareceres deletados localmente (antes da confirmação do backend)
  const [optimisticallyDeleted, setOptimisticallyDeleted] = useState<Set<string>>(new Set());
  const [optimisticallyEdited, setOptimisticallyEdited] = useState<Map<string, Partial<Note>>>(new Map());
  
  // Filtrar pareceres deletados (backend + otimista) e aplicar edições otimistas
  const filteredNotes = useMemo(() => {
    return (notes || []).filter((n) => !n.deleted && !optimisticallyDeleted.has(n.id)).map((n) => {
      const edit = optimisticallyEdited.get(n.id);
      return edit ? { ...n, ...edit } : n;
    });
  }, [notes, optimisticallyDeleted, optimisticallyEdited]);
  
  const tree = useMemo(() => buildTree(filteredNotes), [filteredNotes]);
  
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
  
  return (
    <div className="space-y-2">
      {(!filteredNotes || filteredNotes.length === 0) && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
      {tree.map((n) => (
        <NoteItem
          key={n.id}
          cardId={cardId}
          node={n as any}
          depth={0}
          attachments={attachments}
          profiles={profiles}
          tasks={tasks}
          onReply={onReply}
          onEdit={handleEditOptimistic}
          onDelete={handleDeleteOptimistic}
          onDecisionChange={onDecisionChange}
          onOpenTask={onOpenTask}
          onToggleTask={onToggleTask}
          applicantName={applicantName}
          currentUserId={currentUserId}
          canWrite={canWrite}
          onTypingChange={onTypingChange}
        />
      ))}
    </div>
  );
}

function NoteItem({
  cardId,
  node,
  depth,
  attachments,
  profiles,
  tasks,
  onReply,
  onEdit,
  onDelete,
  onDecisionChange,
  onOpenTask,
  onToggleTask,
  applicantName,
  currentUserId,
  canWrite,
  onTypingChange,
}: {
  cardId: string;
  node: any;
  depth: number;
  attachments?: CardAttachment[];
  profiles: ProfileLite[];
  tasks: CardTask[];
  onReply: (parentId: string, value: ComposerValue) => Promise<string | null>;
  onEdit: (id: string, value: ComposerValue) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onDecisionChange: (decision: ComposerDecision | null) => Promise<void>;
  onOpenTask: (context: { parentId?: string | null; taskId?: string | null; source?: "parecer" | "conversa" }) => void;
  onToggleTask: (taskId: string, done: boolean) => Promise<void> | void;
  applicantName?: string | null;
  currentUserId?: string | null;
  canWrite?: boolean;
  onTypingChange?: (typing: boolean) => void;
}) {
  const replyComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const editComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);
  const replyRef = useRef<HTMLDivElement | null>(null);
  const replyAttachInputRef = useRef<HTMLInputElement | null>(null);
  const [isReplying, setIsReplying] = useState(false);
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
  const nodeTasks = tasks.filter((t) => (t as any).comment_id === node.id);
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

  // Fechar campo de edição ao clicar fora
  useEffect(() => {
    if (!isEditing) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node | null;
      if (editRef.current && target && !editRef.current.contains(target)) {
        setIsEditing(false);
        setEditCmdOpen(false);
        onTypingChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  // Fechar campo de resposta ao clicar fora
  useEffect(() => {
    if (!isReplying) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node | null;
      if (replyRef.current && target && !replyRef.current.contains(target)) {
        setIsReplying(false);
        setCmdOpen(false);
        onTypingChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isReplying]);

  return (
    <div 
      className={clsx("rounded-[2px] border border-zinc-400 bg-blue-100 px-3 py-3 text-sm text-zinc-800", !isRoot && "pl-3")}
      style={{ 
        marginLeft: isRoot ? 0 : depth * 16, 
        borderLeftColor: 'var(--verde-primario)', 
        borderLeftWidth: '8px' 
      }}
    >      
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isRoot ? (
            <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center">
              <span className="text-xs">{(node.author_name || "?").slice(0, 2)}</span>
            </div>
          )}
          <div className="leading-tight min-w-0">
            <div className="text-sm font-medium text-zinc-900 truncate">{node.author_name || "—"}</div>
            <div className="text-[11px] text-zinc-500">{new Date(node.created_at || "").toLocaleString()}</div>
            {node.author_role && (
              <div className="text-[11px] text-zinc-500 truncate">{node.author_role}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
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
        </div>
      </div>

      {/* Content */}
      {!isEditing ? (
        <div className="mt-1 space-y-2">
          {node.decision ? <DecisionTag decision={node.decision} /> : null}
          {trimmedText.length > 0 && <div className="break-words">{renderTextWithChips(node.text)}</div>}
        </div>
      ) : (
        <div className="mt-2" ref={editRef}>
          <div className="relative">
            <UnifiedComposer
              ref={editComposerRef}
              className="composer-root--blue"
              defaultValue={editValue}
              disabled={!canEdit}
              placeholder="Edite o parecer… Use @ para mencionar e / para comandos"
              ariaLabel="Editar parecer"
              richText
              
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
                const opts = ['aprovado','negado','reanalise'].filter(k => k.includes((query||'').toLowerCase()));
                if (opts.length === 1) {
                  editComposerRef.current?.setDecision(opts[0] as any);
                  setEditCmdOpen(false); setEditCmdQuery('');
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
                      if (!trimmed) return;
                      try {
                        await onEdit(node.id, val);
                        if (val.decision === "aprovado" || val.decision === "negado") {
                          await onDecisionChange(val.decision);
                        } else if (val.decision === "reanalise") {
                          await onDecisionChange("reanalise");
                        }
                        setIsEditing(false);
                        setEditCmdOpen(false);
                        onTypingChange?.(false);
                      } catch (e: any) {
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
                  ].filter((i) => i.key.includes(editCmdQuery) || i.label.toLowerCase().includes(editCmdQuery))}
                  onPick={async (key) => {
                    setEditCmdOpen(false);
                    setEditCmdQuery("");
                    if (key === "aprovado" || key === "negado" || key === "reanalise") {
                      editComposerRef.current?.setDecision(key as any);
                    }
                  }}
                  initialQuery={editCmdQuery}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks */}
      {nodeTasks.length > 0 && (
        <div className="mt-2 space-y-2">
          {nodeTasks.map((task) => {
            const creatorProfile = task.created_by ? profiles.find((p) => p.id === task.created_by) : null;
            const creatorName = creatorProfile?.full_name ?? "Colaborador";
            return (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={(id, done) => onToggleTask(id, done)}
                creatorName={creatorName}
                applicantName={applicantName}
                onEdit={() => onOpenTask({ parentId: node.id, taskId: task.id, source: "parecer" })}
              />
            );
          })}
        </div>
      )}

      {/* TODO: attachment-cards — redesenhar com preview/download por tipo de arquivo antes de reativar */}
      {false && noteAttachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {noteAttachments.map((att) => {
            const authorName = att.author_name || node.author_name || "—";
            const authorRole = att.author_role || node.author_role || null;
            const ts = att.created_at || node.created_at || "";
            const initials = (authorName).slice(0, 2).toUpperCase();
            return (
              <button
                key={att.id}
                type="button"
                onClick={async () => {
                  const url = await getAttachmentUrl(att.id);
                  if (url) window.open(url, "_blank");
                }}
                className="w-full text-left rounded-[2px] border border-zinc-300 bg-white px-3 py-2.5 hover:bg-zinc-50 transition-colors block"
                style={{ borderLeftColor: "var(--verde-primario)", borderLeftWidth: "4px" }}
                title={`Abrir ${att.file_name}`}
              >
                {/* Cabeçalho do autor */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-zinc-600">{initials}</span>
                  </div>
                  <div className="leading-tight min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-800 truncate">{authorName}</div>
                    {authorRole && <div className="text-[10px] text-zinc-500 truncate">{authorRole}</div>}
                  </div>
                  <div className="text-[10px] text-zinc-400 shrink-0 whitespace-nowrap">
                    {ts ? new Date(ts).toLocaleString() : ""}
                  </div>
                </div>
                {/* Arquivo */}
                <div className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-2.5 py-2">
                  <Paperclip className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="truncate text-sm text-zinc-700 flex-1">{att.file_name}</span>
                  <span className="text-xs font-medium shrink-0" style={{ color: "var(--verde-primario)" }}>
                    Abrir
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Reply */}
      {canReply && isReplying && (
        <div className="mt-2" ref={replyRef}>
          <div className="relative">
            <UnifiedComposer
              ref={replyComposerRef}
              className="composer-root--blue"
              placeholder="Responder… Use @ para mencionar e / para comandos"
              ariaLabel="Responder parecer"
              richText
              
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
                const opts = ['aprovado','negado','reanalise'].filter(k => k.includes((query||'').toLowerCase()));
                if (opts.length === 1) {
                  replyComposerRef.current?.setDecision(opts[0] as any);
                  setCmdOpen(false); setCmdQuery('');
                  return true;
                }
                return false;
              }}
              onChange={(val) => { setReplyValue(val); onTypingChange?.(true); }}
              onSubmit={async (val) => {
                const txt = (val.text || "").trim();
                const hasDecision = !!val.decision;
                if (!hasDecision && !txt) return;
                const payloadText = hasDecision && !txt ? decisionPlaceholder(val.decision ?? null) : txt;
                const filesToUpload = replyPendingFiles.slice();
                if (filesToUpload.length > 0) setReplyPendingFiles([]);
                try {
                  const noteId = await onReply(node.id, { ...val, text: payloadText });
                  if (filesToUpload.length > 0 && noteId) {
                    try {
                      await uploadAttachmentBatch({
                        cardId,
                        noteId,
                        files: filesToUpload.map((f) => ({ file: f })),
                      });
                    } catch (uploadErr: any) {
                      console.error('Falha ao enviar anexos da resposta', uploadErr);
                    }
                  }
                  if (val.decision === "aprovado" || val.decision === "negado") {
                    await onDecisionChange(val.decision);
                  } else if (val.decision === "reanalise") {
                    await onDecisionChange("reanalise");
                  }
                  setIsReplying(false);
                  setReplyValue({ decision: null, text: "", mentions: [] });
                  setCmdOpen(false);
                  onTypingChange?.(false);
                } catch (e: any) {
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
                    { key: "tarefa", label: "Tarefa" },
                    { key: "anexo", label: "Anexo" },
                  ].filter((i) => i.key.includes(cmdQuery))}
                  onPick={async (key) => {
                    setCmdOpen(false);
                    setCmdQuery("");
                    if (key === "aprovado" || key === "negado" || key === "reanalise") {
                      replyComposerRef.current?.setDecision(key as any);
                      return;
                    }
                    if (key === "tarefa") {
                      onOpenTask({ parentId: node.id, source: "parecer" });
                      return;
                    }
                    if (key === "anexo") {
                      replyAttachInputRef.current?.click();
                      return;
                    }
                  }}
                  initialQuery={cmdQuery}
                />
              </div>
            )}
          </div>
          {/* Arquivos pendentes para a resposta (selecionados via /anexo) */}
          {replyPendingFiles.length > 0 && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {replyPendingFiles.map((f, i) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-0.5 max-w-[160px]">
                  <Paperclip className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setReplyPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="ml-0.5 text-zinc-400 hover:text-red-500"
                    aria-label={`Remover ${f.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
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
            }}
          />
        </div>
      )}

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((c: any) => (
            <NoteItem
              key={c.id}
              cardId={cardId}
              node={c}
              depth={depth + 1}
              attachments={attachments}
              profiles={profiles}
              tasks={tasks}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onDecisionChange={onDecisionChange}
              onOpenTask={onOpenTask}
              onToggleTask={onToggleTask}
              applicantName={applicantName}
              currentUserId={currentUserId}
              canWrite={canWrite}
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (menuOpen && menuRef.current && t && !menuRef.current.contains(t)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [menuOpen]);
  return (
    <div className="relative" ref={menuRef}>
      <button aria-label="Mais ações" className="parecer-menu-trigger p-2 rounded-full hover:bg-zinc-100 transition-colors duração-200" onClick={() => setMenuOpen((v) => !v)}>
        <MoreHorizontal className="w-4 h-4 text-zinc-600" strokeWidth={2} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
          <div className="parecer-menu-dropdown absolute right-0 top-10 z-[9999] w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 overflow-hidden">
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
