"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { User as UserIcon, ClipboardList, Paperclip, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { addComment, deleteComment, editComment, listComments, listProfiles, type Comment, type ProfileLite } from "./services";
import { listTasks, toggleTask, type CardTask } from "@/features/tasks/services";
import { listAttachments, removeAttachment, publicUrl, type CardAttachment } from "@/features/attachments/services";
import { UnifiedComposer, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const [cmdAnchor, setCmdAnchor] = useState<{top:number;left:number}>({ top: 0, left: 0 });
  const inputRef = useRef<UnifiedComposerHandle|null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CardTask[]>([]);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>("Você");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (uid) {
        const me = (profiles || []).find((p) => p.id === uid);
        if (me?.full_name) setCurrentUserName(me.full_name);
      }
    })();
  }, [profiles]);

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

  function ComposerHeader() {
    const initials = (currentUserName || "—").slice(0,2).toUpperCase();
    const ts = new Date().toLocaleString();
    return (
      <div className="mb-2 flex items-center gap-2">
        <Avatar className="h-7 w-7 text-[10px]">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="text-xs text-zinc-600">
          <span className="font-medium text-zinc-900">{currentUserName}</span>
          <span> • {ts}</span>
        </div>
      </div>
    );
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
    <div>
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title conversas">Conversas Co-relacionadas</h3>
        </div>
        <div className="section-content space-y-3">
          {/* Campo para nova conversa (Thread Pai) no topo */}
          <div className="border-b border-zinc-100 pb-4 mb-4 relative">
              <ComposerHeader />
              <UnifiedComposer
                ref={inputRef}
                placeholder="Escreva um comentário (/tarefa, /anexo, @mencionar)"
                onChange={(val)=> setInput(val.text || "")}
                onSubmit={async (val: ComposerValue)=>{
                  try { await addComment(cardId, (val.text||'').trim()); setInput(""); } catch(e:any){ alert(e?.message||'Falha ao enviar comentário'); }
                }}
                onCancel={()=> { setInput(""); setCmdOpen(false); setMentionOpen(false); }}
                onMentionTrigger={(query)=> { setMentionFilter((query||'').trim()); setMentionOpen(true); }}
                onMentionClose={()=> setMentionOpen(false)}
                onCommandTrigger={(query)=> { setCmdQuery((query||'').toLowerCase()); setCmdOpen(true); }}
                onCommandClose={()=> setCmdOpen(false)}
              />
            {cmdOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <CmdDropdown
                  items={[{key:'tarefa',label:'Tarefa'},{key:'anexo',label:'Anexo'}].filter(i=> i.key.includes(cmdQuery))}
                  onPick={(key)=> {
                    if (key==='tarefa') onOpenTask();
                    if (key==='anexo') onOpenAttach();
                    setCmdOpen(false); setCmdQuery('');
                  }}
                  initialQuery={cmdQuery}
                />
              </div>
            )}
            {mentionOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
              <MentionDropdown
                items={profiles.filter((p) => p.full_name.toLowerCase().includes(mentionFilter.toLowerCase()))}
                onPick={(p) => {
                  // A UI do UnifiedComposer já gerencia inserção; usamos apenas fechamento
                  setMentionOpen(false);
                }}
              />
              </div>
            )}
          </div>

          {loading && <div className="text-xs text-zinc-500">Carregando…</div>}
          {/* Anexos do card (sem vínculo a um comentário específico) */}
          {!loading && attachments.filter((a) => !a.comment_id).length > 0 && (
            <div className="mb-3">
              <div className="text-[12px] font-semibold text-zinc-700 mb-1">Anexos do card</div>
              <div className="space-y-2">
                {attachments.filter((a) => !a.comment_id).map((a) => (
                  <AttachmentRow key={a.id} att={a} />
                ))}
              </div>
            </div>
          )}
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
  const [q, setQ] = useState("");
  const filtered = items.filter((p) => p.full_name.toLowerCase().includes(q.toLowerCase()));
  const order: Array<{key: string; label: string}> = [
    { key: 'vendedor', label: 'Vendedor' },
    { key: 'analista', label: 'Analista' },
    { key: 'gestor',   label: 'Gestor' },
  ];
  const byRole = (role: string) => filtered.filter((p) => (p.role || '').toLowerCase() === role);
  const hasAny = order.some(({key}) => byRole(key).length > 0);
  return (
    <div className="cmd-menu-dropdown mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar pessoas…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
      </div>
      {!hasAny ? (
        <div className="px-3 py-2 text-zinc-500">Sem resultados</div>
      ) : (
        order.map(({key,label}) => {
          const list = byRole(key);
          if (list.length === 0) return null;
          return (
            <div key={key} className="py-1">
              <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">{label}</div>
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left"
                >
                  <span>{p.full_name}{p.role ? ` (${p.role})` : ''}</span>
                </button>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

function CmdDropdown({ items, onPick, initialQuery }: { items: { key: string; label: string }[]; onPick: (key: string) => void; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery || "");
  useEffect(()=> setQ(initialQuery||""), [initialQuery]);
  const filtered = items.filter(i => i.key.includes(q) || i.label.toLowerCase().includes(q.toLowerCase()));
  const iconFor = (key: string) => {
    if (key === 'tarefa') return <ClipboardList className="w-4 h-4" />;
    if (key === 'anexo') return <Paperclip className="w-4 h-4" />;
    return null;
  };
  return (
    <div className="cmd-menu-dropdown mt-2 max-h-48 w-56 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar comando…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
      </div>
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-zinc-500">Sem comandos</div>
      ) : (
        filtered.map((i) => (
          <button
            key={i.key}
            onClick={() => onPick(i.key)}
            className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left"
          >
            {iconFor(i.key)}
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
  const editRef = useRef<HTMLDivElement | null>(null);
  const replyRef = useRef<HTMLDivElement | null>(null);
  const editTaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (isEditing && editRef.current && t && !editRef.current.contains(t)) {
        setIsEditing(false);
      }
      if (isReplying && replyRef.current && t && !replyRef.current.contains(t)) {
        setIsReplying(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isEditing, isReplying]);
  const [text, setText] = useState(node.text || "");
  const [reply, setReply] = useState("");
  const [mentionOpen2, setMentionOpen2] = useState(false);
  const [mentionFilter2, setMentionFilter2] = useState("");
  const [cmdOpen2, setCmdOpen2] = useState(false);
  const [cmdQuery2, setCmdQuery2] = useState("");
  const [cmdAnchor2, setCmdAnchor2] = useState<{top:number;left:number}>({ top: 0, left: 0 });
  // Compositor Unificado - edição
  const [editMentionOpen, setEditMentionOpen] = useState(false);
  const [editMentionFilter, setEditMentionFilter] = useState("");
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState("");
  const [editCmdAnchor, setEditCmdAnchor] = useState<{top:number;left:number}>({ top: 0, left: 0 });
  const replyTaRef = useRef<HTMLTextAreaElement|null>(null);
  const ts = node.created_at ? new Date(node.created_at).toLocaleString() : "";
  function onReplyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // @ts-ignore
    if (e.nativeEvent && e.nativeEvent.isComposing) return;
    if (e.key === '/') {
      setCmdOpen2(true);
      const ta = replyTaRef.current || (e.currentTarget as HTMLTextAreaElement);
      if (ta) {
        const pos = (ta.selectionStart ?? ta.value.length) + 1;
        const c = getCaretCoordinates(ta, pos);
        const top = ta.offsetTop + c.top + c.height + 6;
        const leftRaw = ta.offsetLeft + c.left;
        const left = Math.max(0, Math.min(leftRaw, ta.clientWidth - 224));
        setCmdAnchor2({ top, left });
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const t = reply.trim();
      if (!t) return;
      (async () => { try { await onReply(node.id, t); setReply(""); setIsReplying(false); } catch(e:any){ alert(e?.message||'Falha ao responder'); } })();
      return;
    }
    const val = (e.currentTarget.value || "") + (e.key.length === 1 ? e.key : "");
    const atIdx = val.lastIndexOf("@");
    if (atIdx >= 0) { setMentionFilter2(val.slice(atIdx + 1).trim()); setMentionOpen2(true); } else { setMentionOpen2(false); }
    const slashIdx = val.lastIndexOf("/");
    if (slashIdx >= 0) {
      setCmdQuery2(val.slice(slashIdx + 1).toLowerCase()); setCmdOpen2(true);
      if (replyTaRef.current) {
        const ta = replyTaRef.current;
        const c = getCaretCoordinates(ta, slashIdx + 1);
        const rect = ta.getBoundingClientRect();
        const top = rect.top + window.scrollY + c.top + c.height + 6;
        const left = rect.left + window.scrollX + c.left;
        setCmdAnchor2({ top, left });
      }
    } else { setCmdOpen2(false); }
    if (val.endsWith("/tarefa")) { onOpenTask(node.id); }
    else if (val.endsWith("/anexo")) { onOpenAttach(node.id); }
  }

  function onReplyKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const v = (e.currentTarget.value || '');
    const slashIdx = v.lastIndexOf('/');
    if (slashIdx >= 0) {
      setCmdQuery2(v.slice(slashIdx + 1).toLowerCase());
      setCmdOpen2(true);
      if (replyTaRef.current) {
        const ta = replyTaRef.current;
        const c = getCaretCoordinates(ta, slashIdx + 1);
        const top = ta.offsetTop + c.top + c.height + 6;
        const leftRaw = ta.offsetLeft + c.left;
        const left = Math.max(0, Math.min(leftRaw, ta.clientWidth - 224));
        setCmdAnchor2({ top, left });
      }
    } else {
      setCmdOpen2(false);
    }
  }
  return (
    <div className="comment-card rounded-lg pl-3" style={{ marginLeft: depth * 16, borderLeftColor: 'var(--verde-primario)', borderLeftWidth: '8px' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-medium comment-author text-zinc-900">{node.author_name || "—"} <span className="comment-timestamp">{ts}</span></div>
            {node.author_role && <div className="text-[11px] text-zinc-900 truncate">{node.author_role}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Responder" onClick={()=> setIsReplying(v=>!v)} className="text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M4 12h16M12 4l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <CommentMenu onEdit={()=> setIsEditing(true)} onDelete={async ()=> { if (confirm('Excluir este comentário?')) { try { await onDelete(node.id); } catch(e:any){ alert(e?.message||'Falha ao excluir'); } } }} />
        </div>
      </div>
      {!isEditing ? (
        <div className="mt-1 whitespace-pre-line break-words">{node.text}</div>
      ) : (
        <div className="mt-2" ref={editRef}>
          <div className="relative">
            <ComposerHeader />
            <UnifiedComposer
              defaultValue={{ decision: null, text: text }}
              placeholder="Edite o comentário… (@mencionar, /tarefa, /anexo)"
              onChange={(val)=> setText(val.text || "")}
              onSubmit={async (val)=>{
                try { await onEdit(node.id, (val.text||'').trim()); setIsEditing(false); } catch(e:any){ alert(e?.message||'Falha ao editar'); }
              }}
              onCancel={()=> { setIsEditing(false); setEditMentionOpen(false); setEditCmdOpen(false); }}
              onMentionTrigger={(query)=> { setEditMentionFilter((query||'').trim()); setEditMentionOpen(true); }}
              onMentionClose={()=> setEditMentionOpen(false)}
              onCommandTrigger={(query)=> { setEditCmdQuery((query||'').toLowerCase()); setEditCmdOpen(true); }}
              onCommandClose={()=> setEditCmdOpen(false)}
            />
            {editMentionOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <MentionDropdown
                  items={(profiles || []).filter((p)=> (p.full_name||'').toLowerCase().includes(editMentionFilter.toLowerCase()))}
                  onPick={(p)=>{
                    setEditMentionOpen(false);
                  }}
                />
              </div>
            )}
            {editCmdOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <CmdDropdown
                  items={[{key:'tarefa',label:'Tarefa'},{key:'anexo',label:'Anexo'}].filter(i=> i.key.includes(editCmdQuery))}
                  onPick={(key)=> {
                    if (key==='tarefa') onOpenTask(node.id);
                    if (key==='anexo') onOpenAttach(node.id);
                    setEditCmdOpen(false); setEditCmdQuery('');
                  }}
                  initialQuery={editCmdQuery}
                />
              </div>
            )}
          </div>
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
        <div className="mt-2 flex gap-2 items-start relative" ref={replyRef}>
          <div className="flex-1">
            <ComposerHeader />
            <UnifiedComposer
              defaultValue={{ decision: null, text: reply }}
              placeholder="Responder... (/tarefa, /anexo, @mencionar)"
              onChange={(val)=> setReply(val.text || "")}
              onSubmit={async (val)=>{
                const trimmed = (val.text||'').trim();
                if (!trimmed) return;
                try { await onReply(node.id, trimmed); setReply(""); setIsReplying(false); } catch(e:any){ alert(e?.message||'Falha ao responder'); }
              }}
              onCancel={()=> { setIsReplying(false); setMentionOpen2(false); setCmdOpen2(false); }}
              onMentionTrigger={(query)=> { setMentionFilter2((query||'').trim()); setMentionOpen2(true); }}
              onMentionClose={()=> setMentionOpen2(false)}
              onCommandTrigger={(query)=> { setCmdQuery2((query||'').toLowerCase()); setCmdOpen2(true); }}
              onCommandClose={()=> setCmdOpen2(false)}
            />
            {mentionOpen2 && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
              <MentionDropdown
                items={profiles.filter((p) => p.full_name.toLowerCase().includes(mentionFilter2.toLowerCase()))}
                onPick={(p) => {
                  setMentionOpen2(false);
                }}
              />
              </div>
            )}
          </div>
          {cmdOpen2 && (
            <div className="absolute z-50 left-0 bottom-full mb-2">
              <CmdDropdown
                items={[{key:'tarefa',label:'Tarefa'},{key:'anexo',label:'Anexo'}].filter(i=> i.key.includes(cmdQuery2))}
                onPick={(key)=> { if (key==='tarefa') onOpenTask(node.id); if (key==='anexo') onOpenAttach(node.id); setCmdOpen2(false); setCmdQuery2(''); }}
                initialQuery={cmdQuery2}
              />
            </div>
          )}
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (open && menuRef.current && t && !menuRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);
  return (
    <div className="relative" ref={menuRef}>
      <button 
        aria-label="Mais ações" 
        className="comment-menu-trigger p-2 rounded-full hover:bg-zinc-100 transition-colors duration-200" 
        onClick={()=> setOpen(v=>!v)}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-600" strokeWidth={3}>
          <path d="M6 12h.01M12 12h.01M18 12h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div className="comment-menu-dropdown absolute right-0 top-10 z-[9999] w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 overflow-hidden">
            <button 
              className="comment-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors duration-150" 
              onClick={()=> { setOpen(false); onEdit(); }}
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <div className="h-px bg-zinc-100 mx-2" />
            <button 
              className="comment-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-150" 
              onClick={async ()=> { setOpen(false); await onDelete(); }}
            >
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

// Utilitário para localizar posição do caret (ou índice específico) no textarea
function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  const props = [
    'direction','boxSizing','height','overflowX','overflowY','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','paddingTop','paddingRight','paddingBottom','paddingLeft','fontStyle','fontVariant','fontWeight','fontStretch','fontSize','fontFamily','lineHeight','textAlign','textTransform','textIndent','textDecoration','letterSpacing','tabSize','MozTabSize'
  ];
  props.forEach((p:any)=> { (mirror.style as any)[p] = (style as any)[p] ?? style.getPropertyValue(p); });
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.textContent = textarea.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = textarea.value.substring(position) || '.';
  mirror.appendChild(span);
  document.body.appendChild(mirror);
  const spRect = span.getBoundingClientRect();
  const top = spRect.top + textarea.scrollTop;
  const left = spRect.left + textarea.scrollLeft;
  const height = spRect.height || parseFloat(style.lineHeight) || 16;
  document.body.removeChild(mirror);
  return { top, left, height };
}
