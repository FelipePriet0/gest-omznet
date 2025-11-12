"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { UnifiedComposer, type ComposerDecision, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import { TaskCard } from "@/features/tasks/TaskCard";
import type { CardTask } from "@/features/tasks/services";
import type { ProfileLite } from "@/features/comments/services";
import { renderTextWithChips } from "@/utils/richText";
import { CmdDropdown } from "../components/CmdDropdown";
import { DecisionTag, decisionPlaceholder } from "../utils/decision";

type Note = { id: string; text: string; author_id?: string | null; author_name?: string; author_role?: string | null; created_at?: string; parent_id?: string | null; level?: number; deleted?: boolean; decision?: ComposerDecision | string | null };

function buildTree(notes: Note[]): Note[] {
  const byId = new Map<string, any>();
  const normalizeText = (note: any) => {
    if (!note) return "";
    if (!note.decision) return note.text || "";
    const placeholder = decisionPlaceholder(note.decision as any);
    return note.text === placeholder ? "" : (note.text || "");
  };
  notes.forEach((n) => byId.set(n.id, { ...n, text: normalizeText(n), children: [] as any[] }));
  const roots: any[] = [];
  notes.forEach((n) => {
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
}: {
  cardId: string;
  notes: Note[];
  profiles: ProfileLite[];
  tasks: CardTask[];
  applicantName?: string | null;
  onReply: (parentId: string, value: ComposerValue) => Promise<any>;
  onEdit: (id: string, value: ComposerValue) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onDecisionChange: (decision: ComposerDecision | null) => Promise<void>;
  onOpenTask: (context: { parentId?: string | null; taskId?: string | null; source?: "parecer" | "conversa" }) => void;
  onToggleTask: (taskId: string, done: boolean) => Promise<void> | void;
  currentUserId?: string | null;
}) {
  const tree = useMemo(() => buildTree(notes || []), [notes]);
  return (
    <div className="space-y-2">
      {(!notes || notes.length === 0) && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
      {tree.map((n) => (
        <NoteItem
          key={n.id}
          cardId={cardId}
          node={n as any}
          depth={0}
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
        />
      ))}
    </div>
  );
}

function NoteItem({
  cardId,
  node,
  depth,
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
}: {
  cardId: string;
  node: any;
  depth: number;
  profiles: ProfileLite[];
  tasks: CardTask[];
  onReply: (parentId: string, value: ComposerValue) => Promise<any>;
  onEdit: (id: string, value: ComposerValue) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onDecisionChange: (decision: ComposerDecision | null) => Promise<void>;
  onOpenTask: (context: { parentId?: string | null; taskId?: string | null; source?: "parecer" | "conversa" }) => void;
  onToggleTask: (taskId: string, done: boolean) => Promise<void> | void;
  applicantName?: string | null;
  currentUserId?: string | null;
}) {
  const replyComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const editComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyValue, setReplyValue] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState("");

  useEffect(() => {
    const onOpenAttach = (e: any) => {
      // apenas marcador; o modal raiz escuta e abre input hidden
    };
    window.addEventListener("mz-open-attach", onOpenAttach as any);
    return () => window.removeEventListener("mz-open-attach", onOpenAttach as any);
  }, []);

  const trimmedText = (node.text || "").trim();
  const nodeTasks = tasks.filter((t) => (t as any).comment_id === node.id);
  const isRoot = depth === 0;

  return (
    <div className={clsx("rounded-lg border border-zinc-200 bg-white p-3", isRoot ? "" : "ml-6")}>      
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center">
            <span className="text-xs">{(node.author_name || "?").slice(0, 2)}</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium text-zinc-900">{node.author_name || "—"}</div>
            <div className="text-[11px] text-zinc-500">{new Date(node.created_at || "").toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Responder"
            onClick={() => {
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
            className="text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M4 12h16M12 4l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {currentUserId && node.author_id && node.author_id === currentUserId ? (
            <ParecerMenu
              onEdit={() => {
                const initial: ComposerValue = { decision: (node.decision as ComposerDecision | null) ?? null, text: node.text || "", mentions: [] };
                setEditValue(initial);
                setIsEditing(true);
                requestAnimationFrame(() => {
                  editComposerRef.current?.setValue(initial);
                  editComposerRef.current?.focus();
                });
              }}
              onDelete={async () => {
                if (confirm("Excluir este parecer?")) {
                  try {
                    await onDelete(node.id);
                  } catch (e: any) {
                    alert(e?.message || "Falha ao excluir parecer");
                  }
                }
              }}
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
              defaultValue={editValue}
              placeholder="Edite o parecer… Use @ para mencionar e / para comandos"
              onChange={(val) => setEditValue(val)}
              onSubmit={async (val) => {
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
                } catch (e: any) {
                  alert(e?.message || "Falha ao editar parecer");
                }
              }}
              onCancel={() => {
                setIsEditing(false);
                setEditCmdOpen(false);
              }}
              onCommandTrigger={(query) => {
                setEditCmdQuery(query.toLowerCase());
                setEditCmdOpen(true);
              }}
              onCommandClose={() => {
                setEditCmdOpen(false);
                setEditCmdQuery("");
              }}
            />
            {editCmdOpen && (
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
                      try {
                        await onDecisionChange(key as any);
                      } catch (e: any) {
                        alert(e?.message || "Falha ao mover");
                      }
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

      {/* Reply */}
      <div className="mt-2">
        <div className="relative">
          <UnifiedComposer
            ref={replyComposerRef}
            placeholder="Responder… Use @ para mencionar e / para comandos"
            onChange={(val) => setReplyValue(val)}
            onSubmit={async (val) => {
              const txt = (val.text || "").trim();
              const hasDecision = !!val.decision;
              if (!hasDecision && !txt) return;
              const payloadText = hasDecision && !txt ? decisionPlaceholder(val.decision ?? null) : txt;
              try {
                await onReply(node.id, { ...val, text: payloadText });
                if (val.decision === "aprovado" || val.decision === "negado") {
                  await onDecisionChange(val.decision);
                } else if (val.decision === "reanalise") {
                  await onDecisionChange("reanalise");
                }
                setIsReplying(false);
                setReplyValue({ decision: null, text: "", mentions: [] });
                setCmdOpen(false);
              } catch (e: any) {
                alert(e?.message || "Falha ao responder");
              }
            }}
            onCancel={() => {
              setIsReplying(false);
              setCmdOpen(false);
            }}
            onCommandTrigger={(query) => {
              setCmdQuery(query.toLowerCase());
              setCmdOpen(true);
            }}
            onCommandClose={() => {
              setCmdOpen(false);
              setCmdQuery("");
            }}
          />
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
                    try {
                      await onDecisionChange(key as any);
                    } catch (e: any) {
                      alert(e?.message || "Falha ao mover");
                    }
                    return;
                  }
                  if (key === "tarefa") {
                    onOpenTask({ parentId: node.id, source: "parecer" });
                    return;
                  }
                  if (key === "anexo") {
                    try {
                      const ev = new CustomEvent("mz-open-attach", { detail: { commentId: node.id, source: "parecer" } });
                      window.dispatchEvent(ev);
                    } catch {}
                    return;
                  }
                }}
                initialQuery={cmdQuery}
              />
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((c: any) => (
            <NoteItem
              key={c.id}
              cardId={cardId}
              node={c}
              depth={depth + 1}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParecerMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (open && menuRef.current && t && !menuRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);
  return (
    <div className="relative" ref={menuRef}>
      <button aria-label="Mais ações" className="parecer-menu-trigger p-2 rounded-full hover:bg-zinc-100 transition-colors duration-200" onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal className="w-4 h-4 text-zinc-600" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div className="parecer-menu-dropdown absolute right-0 top-10 z-[9999] w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 overflow-hidden">
            <button className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors duration-150" onClick={() => { setOpen(false); onEdit(); }}>
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <div className="h-px bg-zinc-100 mx-2" />
            <button className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-150" onClick={async () => { setOpen(false); await onDelete(); }}>
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}
