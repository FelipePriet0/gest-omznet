"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { addComment, deleteComment, editComment, listComments, listProfiles, type Comment, type ProfileLite } from "./services";
import { listTasks, toggleTask, type CardTask } from "@/features/tasks/services";
import { listAttachments, removeAttachment, publicUrl, type CardAttachment } from "@/features/attachments/services";

type TaskTrigger = { openTask: (parentCommentId?: string) => void };
type AttachTrigger = { openAttach: (parentCommentId?: string) => void };

export function Conversation({ cardId, onOpenTask, onOpenAttach, onEditTask }: { cardId: string; onOpenTask: TaskTrigger["openTask"]; onOpenAttach: AttachTrigger["openAttach"]; onEditTask?: (taskId: string) => void; }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CardTask[]>([]);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setComments(await listComments(cardId));
      setProfiles(await listProfiles());
      setTasks(await listTasks(cardId));
      setAttachments(await listAttachments(cardId));
      setLoading(false);
    })();
    const channel = supabase
      .channel(`card-comments-${cardId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "card_comments", filter: `card_id=eq.${cardId}` }, () => refresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "card_comments", filter: `card_id=eq.${cardId}` }, () => refresh())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "card_comments", filter: `card_id=eq.${cardId}` }, () => refresh())
      .subscribe();
    const chTasks = supabase
      .channel(`card-tasks-${cardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_tasks", filter: `card_id=eq.${cardId}` }, () => refreshTasks())
      .subscribe();
    const chAtt = supabase
      .channel(`card-attachments-${cardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_attachments", filter: `card_id=eq.${cardId}` }, () => refreshAtt())
      .subscribe();
    async function refresh() { if (!active) return; setComments(await listComments(cardId)); }
    async function refreshTasks() { if (!active) return; setTasks(await listTasks(cardId)); }
    async function refreshAtt() { if (!active) return; setAttachments(await listAttachments(cardId)); }
    return () => { active = false; supabase.removeChannel(channel); supabase.removeChannel(chTasks); supabase.removeChannel(chAtt); };
  }, [cardId]);

  const tree = useMemo(() => buildTree(comments || []), [comments]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitNew();
    }
    const val = (e.currentTarget.value || "") + (e.key.length === 1 ? e.key : "");
    // Mentions
    const atIdx = val.lastIndexOf("@");
    if (atIdx >= 0) {
      setMentionFilter(val.slice(atIdx + 1).trim());
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
    // Slash commands (dropdown estilo Notion)
    const slashIdx = val.lastIndexOf("/");
    if (slashIdx >= 0) {
      const q = val.slice(slashIdx + 1);
      setCmdQuery(q.toLowerCase());
      setCmdOpen(true);
    } else {
      setCmdOpen(false);
    }
  }

  async function submitNew(parentId?: string) {
    const text = input.trim();
    if (!text) return;
    try {
      await addComment(cardId, text, parentId);
      setInput("");
    } catch (e: any) {
      alert(e?.message || "Falha ao enviar comentário");
    }
  }

  return (
    <div className="space-y-3">
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title">Conversas Co-relacionadas</h3>
        </div>
        <div className="section-content space-y-3">
          {loading && <div className="text-xs text-zinc-500">Carregando…</div>}
          {!loading && comments.length === 0 && <div className="text-xs text-zinc-500">Nenhuma conversa iniciada</div>}
          {tree.map((n) => (
            <CommentItem
              key={n.id}
              node={n}
              depth={0}
              onReply={(id, text) => addComment(cardId, text, id)}
              onEdit={editComment}
              onDelete={deleteComment}
              onOpenAttach={onOpenAttach}
              onOpenTask={onOpenTask}
              tasks={tasks.filter((t) => t.comment_id === n.id)}
              attachments={attachments.filter((a) => a.comment_id === n.id)}
              onToggleTask={toggleTask}
              profiles={profiles}
            />
          ))}
        </div>
        <div className="border-t border-zinc-100 pt-4 mt-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escreva um comentário (/tarefa, /anexo, @mencionar)"
              className="flex-1 field-input"
            />
            <button onClick={() => submitNew()} className="btn-primary-mznet">Enviar</button>
          </div>
          {cmdOpen && (
            <CmdDropdown
              items={[{key:'tarefa',label:'📋 Tarefa'},{key:'anexo',label:'📎 Anexo'}].filter(i=> i.key.includes(cmdQuery))}
              onPick={(key)=> {
                if (key==='tarefa') onOpenTask();
                if (key==='anexo') onOpenAttach();
                setCmdOpen(false); setCmdQuery('');
              }}
            />
          )}
          {mentionOpen && (
            <MentionDropdown
              items={profiles.filter((p) => p.full_name.toLowerCase().includes(mentionFilter.toLowerCase()))}
              onPick={(p) => {
                // Substitui o trecho após o último @
                const idx = input.lastIndexOf("@");
                const newVal = input.slice(0, idx + 1) + p.full_name + " ";
                setInput(newVal);
                setMentionOpen(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function buildTree(notes: Comment[]): any[] {
  const byId = new Map<string, any>();
  notes.forEach((n) => byId.set(n.id, { ...n, children: [] as any[] }));
  const roots: any[] = [];
  notes.forEach((n) => {
    const node = byId.get(n.id)!;
    if ((n as any).deleted_at) return;
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

function MentionDropdown({ items, onPick }: { items: ProfileLite[]; onPick: (p: ProfileLite) => void }) {
  return (
    <div className="mt-2 max-h-48 w-full overflow-auto rounded border bg-white text-sm shadow">
      {items.length === 0 ? (
        <div className="px-3 py-2 text-zinc-500">Sem resultados</div>
      ) : (
        items.map((p) => (
          <button key={p.id} onClick={() => onPick(p)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-zinc-50">
            <span>{p.full_name}</span>
            <span className="text-xs text-zinc-500">{p.role ?? ""}</span>
          </button>
        ))
      )}
    </div>
  );
}

function CmdDropdown({ items, onPick }: { items: { key: string; label: string }[]; onPick: (key: string) => void }) {
  return (
    <div className="mt-2 max-h-48 w-full overflow-auto rounded border bg-white text-sm shadow">
      {items.length === 0 ? (
        <div className="px-3 py-2 text-zinc-500">Sem comandos</div>
      ) : (
        items.map((i) => (
          <button key={i.key} onClick={() => onPick(i.key)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50">
            <span>{i.label}</span>
          </button>
        ))
      )}
    </div>
  );
}

// Notificações agora são geradas por triggers no backend para evitar duplicatas

function CommentItem({ node, depth, onReply, onEdit, onDelete, onOpenAttach, onOpenTask, tasks, attachments, onToggleTask, profiles }: { node: any; depth: number; onReply: (parentId: string, text: string) => Promise<any>; onEdit: (id: string, text: string) => Promise<any>; onDelete: (id: string) => Promise<any>; onOpenAttach: (parentId?: string) => void; onOpenTask: (parentId?: string) => void; tasks: CardTask[]; attachments: CardAttachment[]; onToggleTask: (id: string, done: boolean) => Promise<any>; profiles: ProfileLite[]; }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [text, setText] = useState(node.text || "");
  const [reply, setReply] = useState("");
  const [mentionOpen2, setMentionOpen2] = useState(false);
  const [mentionFilter2, setMentionFilter2] = useState("");
  const [cmdOpen2, setCmdOpen2] = useState(false);
  const [cmdQuery2, setCmdQuery2] = useState("");
  const ts = node.created_at ? new Date(node.created_at).toLocaleString() : "";
  function onReplyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (async () => { try { await onReply(node.id, reply); setReply(""); setIsReplying(false); } catch(e:any){ alert(e?.message||'Falha ao responder'); } })();
      return;
    }
    const val = (e.currentTarget.value || "") + (e.key.length === 1 ? e.key : "");
    const atIdx = val.lastIndexOf("@");
    if (atIdx >= 0) { setMentionFilter2(val.slice(atIdx + 1).trim()); setMentionOpen2(true); } else { setMentionOpen2(false); }
    const slashIdx = val.lastIndexOf("/");
    if (slashIdx >= 0) { setCmdQuery2(val.slice(slashIdx + 1).toLowerCase()); setCmdOpen2(true); } else { setCmdOpen2(false); }
    if (val.endsWith("/tarefa")) { onOpenTask(node.id); }
    else if (val.endsWith("/anexo")) { onOpenAttach(node.id); }
  }
  return (
    <div className="comment-card" style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium comment-author">{node.author_name || "—"} {node.author_role ? <span className="comment-role">({node.author_role})</span> : null} <span className="comment-timestamp">{ts}</span></div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button className="comment-action-btn comment-action-reply" onClick={() => setIsReplying((v) => !v)}>→ Responder</button>
          <button className="comment-action-btn" onClick={() => onOpenAttach(node.id)}>Anexo</button>
          <button className="comment-action-btn" onClick={() => onOpenTask(node.id)}>Tarefa</button>
          <CommentMenu onEdit={()=> setIsEditing(true)} onDelete={async ()=> { if (confirm('Excluir este comentário?')) { try { await onDelete(node.id); } catch(e:any){ alert(e?.message||'Falha ao excluir'); } } }} />
        </div>
      </div>
      {!isEditing ? (
        <div className="mt-1 whitespace-pre-line">{node.text}</div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 field-input" />
          <button className="btn-small-primary" onClick={async () => { try { await onEdit(node.id, text); setIsEditing(false); } catch (e:any) { alert(e?.message||'Falha ao editar'); } }}>Salvar</button>
          <button className="btn-small-secondary" onClick={() => { setText(node.text || ""); setIsEditing(false); }}>Cancelar</button>
        </div>
      )}
      {tasks && tasks.length > 0 && (
        <div className="mt-2 space-y-2">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={async (id, done)=> { try { await onToggleTask(id, done); } catch (e:any) { alert(e?.message||'Falha ao atualizar tarefa'); } }} onOpenEdit={onEditTask} />
          ))}
        </div>
      )}
      {attachments && attachments.length > 0 && (
        <div className="mt-2 space-y-2">
          {attachments.map((a) => (
            <AttachmentRow key={a.id} att={a} />
          ))}
        </div>
      )}
      {isReplying && (
        <div className="mt-2 flex gap-2 items-start">
          <div className="flex-1">
            <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={onReplyKeyDown} placeholder="Responder... (/tarefa, /anexo, @mencionar)" className="w-full field-input" />
            {mentionOpen2 && (
              <MentionDropdown
                items={profiles.filter((p) => p.full_name.toLowerCase().includes(mentionFilter2.toLowerCase()))}
                onPick={(p) => {
                  const idx = reply.lastIndexOf("@");
                  const newVal = reply.slice(0, idx + 1) + p.full_name + " ";
                  setReply(newVal);
                  setMentionOpen2(false);
                }}
              />
            )}
          </div>
          {cmdOpen2 && (
            <CmdDropdown
              items={[{key:'tarefa',label:'📋 Tarefa'},{key:'anexo',label:'📎 Anexo'}].filter(i=> i.key.includes(cmdQuery2))}
              onPick={(key)=> { if (key==='tarefa') onOpenTask(node.id); if (key==='anexo') onOpenAttach(node.id); setCmdOpen2(false); setCmdQuery2(''); }}
            />
          )}
          <button className="btn-small-primary" onClick={async () => { try { await onReply(node.id, reply); setReply(""); setIsReplying(false); } catch (e:any) { alert(e?.message||'Falha ao responder'); } }}>Enviar</button>
        </div>
      )}
      {node.children && node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((c: any) => (
            <CommentItem
              key={c.id}
              node={c}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenAttach={onOpenAttach}
              onOpenTask={onOpenTask}
              tasks={tasks.filter((t)=> t.comment_id === c.id)}
              attachments={attachments.filter((a)=> a.comment_id === c.id)}
              onToggleTask={onToggleTask}
              profiles={profiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="px-1 text-zinc-700" onClick={()=> setOpen(v=>!v)}>⋮</button>
      {open && (
        <div className="absolute right-0 top-6 z-10 w-36 rounded border bg-white text-xs shadow">
          <button className="block w-full px-3 py-2 text-left hover:bg-zinc-50" onClick={()=> { setOpen(false); onEdit(); }}>Editar</button>
          <button className="block w-full px-3 py-2 text-left text-red-600 hover:bg-zinc-50" onClick={async ()=> { setOpen(false); await onDelete(); }}>Excluir</button>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onToggle, onOpenEdit }: { task: CardTask; onToggle: (id: string, done: boolean) => void | Promise<void>; onOpenEdit?: (taskId: string) => void }) {
  const [assignee, setAssignee] = useState<string | null>(null);
  useEffect(() => { (async () => {
    if (!task.assigned_to) { setAssignee(null); return; }
    try { const { data } = await supabase.from('profiles').select('full_name').eq('id', task.assigned_to).single(); setAssignee((data as any)?.full_name ?? null); } catch {}
  })(); }, [task.assigned_to]);
  const isDone = task.status === 'completed';
  const now = Date.now();
  const dueAt = task.deadline ? new Date(task.deadline).getTime() : null;
  const overdue = !isDone && dueAt !== null && dueAt < now;
  const dueTxt = task.deadline ? new Date(task.deadline).toLocaleString() : null;
  const stateCls = overdue ? "bg-red-50 border-red-200" : isDone ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200";
  return (
    <div className={`rounded border px-3 py-2 text-sm ${stateCls} cursor-pointer`} onClick={()=> onOpenEdit?.(task.id)}>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={isDone} onChange={(e)=> { e.stopPropagation(); onToggle(task.id, e.target.checked); }} />
        <div className={`font-semibold ${isDone ? "line-through text-emerald-700" : overdue ? "text-red-700" : "text-zinc-800"}`}>📋 Tarefa</div>
      </div>
      <div className={`mt-1 ${isDone ? "line-through text-emerald-700" : overdue ? "text-red-700" : "text-zinc-700"}`}>
        <div>👤 Para: <span className="font-medium">@{assignee ?? task.assigned_to ?? "—"}</span></div>
        <div>📝 Descrição: {task.description}</div>
        {dueTxt && <div>⏰ Prazo: {dueTxt}</div>}
      </div>
    </div>
  );
}

function AttachmentRow({ att }: { att: CardAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { (async () => setUrl(await publicUrl(att.file_path)))(); }, [att.file_path]);
  const ts = att.created_at ? new Date(att.created_at).toLocaleString() : "";
  return (
    <div className="flex items-center justify-between rounded border border-zinc-200 bg-white px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{iconFor(att.file_type || "")}</span>
        <div>
          <div className="font-medium">{att.file_name}</div>
          <div className="text-[11px] text-zinc-500">{ts}</div>
        </div>
      </div>
      <div className="relative flex items-center gap-2">
        {url && <a href={url} target="_blank" className="text-zinc-700 hover:underline">↗️</a>}
        <button className="px-1 text-zinc-700" onClick={()=> setOpen(v=>!v)}>⋮</button>
        {open && (
          <div className="absolute right-0 top-6 z-10 w-40 rounded border bg-white shadow">
            <button className="block w-full px-3 py-2 text-left text-red-600 hover:bg-zinc-50" onClick={async ()=> { setOpen(false); if (confirm('🗑️ Excluir anexo? Esta ação não pode ser desfeita.')) { try { await removeAttachment(att.id); } catch(e:any){ alert(e?.message||'Falha ao excluir anexo'); } } }}>🗑️ Excluir anexo</button>
          </div>
        )}
      </div>
    </div>
  );
}

function iconFor(mime: string) {
  if (!mime) return "📦";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("excel")) return "📊";
  if (mime.includes("word")) return "📝";
  if (mime.includes("zip") || mime.includes("rar")) return "📦";
  return "📄";
}
