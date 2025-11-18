"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User as UserIcon, ClipboardList, Paperclip, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { addComment, deleteComment, editComment, listComments, listProfiles, type Comment, type ProfileLite } from "./services";
import { listTasks, toggleTask, type CardTask } from "@/features/tasks/services";
import { TaskCard } from "@/features/tasks/TaskCard";
import { listAttachments, removeAttachment, getAttachmentUrl, type CardAttachment } from "@/features/attachments/services";
import { TABLE_CARD_ATTACHMENTS } from "@/lib/constants";
import { UnifiedComposer, type ComposerValue, type UnifiedComposerHandle } from "@/components/unified-composer/UnifiedComposer";
import { renderTextWithChips } from "@/utils/richText";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ModalPreview, type PreviewTarget } from "@/components/ui/modal-preview";

type CardAttachmentWithMeta = CardAttachment & { isCardRoot?: boolean };

type TaskTrigger = { openTask: (parentCommentId?: string) => void };
type AttachTrigger = { openAttach: (parentCommentId?: string) => void };

function ComposerHeader({ name }: { name: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Avatar className="h-7 w-7 text-[10px]">
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="text-xs text-zinc-600">
        <span className="font-medium text-zinc-900">{name}</span>
        <span> • {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
}

export function Conversation({ cardId, applicantName, onOpenTask, onOpenAttach, onEditTask }: { cardId: string; applicantName?: string | null; onOpenTask: TaskTrigger["openTask"]; onOpenAttach: AttachTrigger["openAttach"]; onEditTask?: (taskId: string) => void; }) {
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
  const [attachments, setAttachments] = useState<CardAttachmentWithMeta[]>([]);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const cardAttachmentIdsRef = useRef<Set<string>>(new Set());
  const [currentUserName, setCurrentUserName] = useState<string>("Você");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) {
        const me = (profiles || []).find((p) => p.id === uid);
        if (me?.full_name) setCurrentUserName(me.full_name);
      }
    })();
  }, [profiles]);

  const profilesById = useMemo(() => {
    const map = new Map<string, ProfileLite>();
    profiles?.forEach((p) => {
      if (p?.id) map.set(p.id, p);
    });
    return map;
  }, [profiles]);

  // Função helper para atualizar comentários após criação
  const refreshComments = useCallback(async () => {
    const updatedComments = await listComments(cardId);
    setComments(updatedComments);
  }, [cardId]);

  // Função para atualizar tudo (comentários, tarefas, anexos) - usado após operações críticas
  const refreshAll = useCallback(async () => {
    const [updatedComments, updatedTasks, updatedAttachments] = await Promise.all([
      listComments(cardId),
      listTasks(cardId),
      listAttachments(cardId)
    ]);
    
    setComments(updatedComments);
    setTasks(updatedTasks);
    
    // Atualizar attachments com isCardRoot
    updatedAttachments.forEach((att) => {
      if (!att.comment_id && !cardAttachmentIdsRef.current.has(att.id)) {
        cardAttachmentIdsRef.current.add(att.id);
      }
    });
    setAttachments(
      updatedAttachments.map((att) => ({
        ...att,
        isCardRoot: cardAttachmentIdsRef.current.has(att.id) || !att.comment_id,
      }))
    );
  }, [cardId]);

  // Wrappers que garantem atualização imediata da UI (não esperar realtime)
  const editCommentWithRefresh = useCallback(async (id: string, text: string) => {
    try {
      await editComment(id, text);
      // Atualização imediata - UX fluida
      await refreshComments();
    } catch (e: any) {
      alert(e?.message || "Falha ao editar comentário");
      throw e;
    }
  }, [refreshComments]);

  const deleteCommentWithRefresh = useCallback(async (id: string) => {
    try {
      await deleteComment(id);
      // Atualização imediata - UX fluida
      await refreshComments();
    } catch (e: any) {
      alert(e?.message || "Falha ao excluir comentário");
      throw e;
    }
  }, [refreshComments]);

  // Wrapper para remover anexo com refresh imediato
  const removeAttachmentWithRefresh = useCallback(async (id: string) => {
    try {
      await removeAttachment(id);
      // Atualização imediata - UX fluida
      const updatedAttachments = await listAttachments(cardId);
      updatedAttachments.forEach((att) => {
        if (!att.comment_id && !cardAttachmentIdsRef.current.has(att.id)) {
          cardAttachmentIdsRef.current.add(att.id);
        }
      });
      setAttachments(
        updatedAttachments.map((att) => ({
          ...att,
          isCardRoot: cardAttachmentIdsRef.current.has(att.id) || !att.comment_id,
        }))
      );
      // Também atualizar comentários caso o anexo tenha comment_id
      await refreshComments();
    } catch (e: any) {
      alert(e?.message || "Falha ao excluir anexo");
      throw e;
    }
  }, [cardId, refreshComments]);

  // Wrapper para toggle task com refresh imediato
  const toggleTaskWithRefresh = useCallback(async (id: string, done: boolean) => {
    try {
      await toggleTask(id, done);
      // Atualização imediata - UX fluida
      const updatedTasks = await listTasks(cardId);
      setTasks(updatedTasks);
    } catch (e: any) {
      alert(e?.message || "Falha ao atualizar tarefa");
      throw e;
    }
  }, [cardId]);

  /**
   * LEI 2 - CONTEÚDO: Fluxo unificado de resposta
   * Funciona para responder Texto, Tarefa, Anexo, qualquer tipo de conteúdo
   */
  const submitComment = async (parentId: string | null, value: ComposerValue) => {
    const text = (value.text || "").trim();
    if (!text) return;
    try {
      await addComment(cardId, text, parentId ?? undefined);
      // Forçar refresh imediato para garantir que a árvore seja atualizada
      // O realtime subscription também atualizará, mas isso garante resposta imediata
      await refreshComments();
    } catch (e: any) {
      alert(e?.message || "Falha ao enviar comentário");
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setComments(await listComments(cardId));
      setProfiles(await listProfiles());
      setTasks(await listTasks(cardId));
      const loadedAttachments = await listAttachments(cardId);
      loadedAttachments.forEach((att) => {
        if (!att.comment_id) cardAttachmentIdsRef.current.add(att.id);
      });
      setAttachments(
        loadedAttachments.map((att) => ({
          ...att,
          isCardRoot: cardAttachmentIdsRef.current.has(att.id) || !att.comment_id,
        }))
      );
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
    async function refreshAtt() {
      if (!active) return;
      const loaded = await listAttachments(cardId);
      loaded.forEach((att) => {
        if (!att.comment_id && !cardAttachmentIdsRef.current.has(att.id)) {
          cardAttachmentIdsRef.current.add(att.id);
        }
      });
      setAttachments(
        loaded.map((att) => ({
          ...att,
          isCardRoot: cardAttachmentIdsRef.current.has(att.id) || !att.comment_id,
        }))
      );
    }
    return () => { active = false; supabase.removeChannel(channel); supabase.removeChannel(chTasks); supabase.removeChannel(chAtt); };
  }, [cardId]);

  const tree = useMemo(() => buildTree(comments || []), [comments]);

  const attachmentCommentIds = useMemo(() => {
    const set = new Set<string>();
    attachments
      .filter((att) => att.isCardRoot && att.comment_id)
      .forEach((att) => {
        if (att.comment_id) set.add(att.comment_id);
      });
    return set;
  }, [attachments]);

  // Função auxiliar para buscar todos os descendentes de um comentário (recursivamente)
  const getAllDescendantIds = useCallback((parentId: string, allComments: Comment[]): Set<string> => {
    const descendants = new Set<string>();
    const findDescendants = (pid: string) => {
      const directChildren = allComments.filter((c) => c.parent_id === pid);
      directChildren.forEach((child) => {
        descendants.add(child.id);
        findDescendants(child.id); // Recursivamente buscar filhos
      });
    };
    findDescendants(parentId);
    return descendants;
  }, []);

  const attachmentReplyIds = useMemo(() => {
    const ids = new Set<string>();
    attachments
      .filter((att) => att.isCardRoot && att.comment_id)
      .forEach((att) => {
        if (att.comment_id) {
          // Buscar TODOS os descendentes recursivamente, não apenas filhos diretos
          const descendants = getAllDescendantIds(att.comment_id, comments);
          descendants.forEach((id) => ids.add(id));
        }
      });
    return ids;
  }, [attachments, comments, getAllDescendantIds]);

  const conversationTree = useMemo(() => {
    const clone = JSON.parse(JSON.stringify(tree));
    return (clone as any[]).filter(
      (node: any) => !attachmentCommentIds.has(node.id) && !attachmentReplyIds.has(node.id)
    );
  }, [tree, attachmentCommentIds, attachmentReplyIds]);

  const ensureAttachmentComment = useCallback(async (attachment: CardAttachmentWithMeta) => {
    if (attachment.comment_id) return attachment.comment_id;
    const basePayload: any = {
      card_id: cardId,
      content: "",
    };
    if (currentUserId) {
      basePayload.author_id = currentUserId;
      basePayload.author_name = currentUserName;
    }
    const { data, error } = await supabase
      .from("card_comments")
      .insert(basePayload)
      .select("id")
      .single();
    if (error || !data?.id) {
      throw new Error(error?.message ?? "Falha ao vincular comentário ao anexo");
    }
    const newCommentId = data.id as string;
    await supabase.from(TABLE_CARD_ATTACHMENTS).update({ comment_id: newCommentId }).eq("id", attachment.id);
    cardAttachmentIdsRef.current.add(attachment.id);
    setAttachments((prev) =>
      prev.map((a) =>
        a.id === attachment.id
          ? {
              ...a,
              comment_id: newCommentId,
              isCardRoot: true,
            }
          : a
      )
    );
    return newCommentId;
  }, [cardId, currentUserId, currentUserName]);

  async function submitNew(parentId?: string) {
    const text = input.trim();
    if (!text) return;
    try {
      await addComment(cardId, text, parentId);
      setInput("");
      // Atualização imediata - UX fluida (não esperar realtime)
      await refreshComments();
    } catch (e: any) {
      alert(e?.message || "Falha ao enviar comentário");
    }
  }

  return (
    <div>
      <ModalPreview file={preview} onClose={() => setPreview(null)} />
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title conversas">Conversas Co-relacionadas</h3>
        </div>
        <div className="section-content space-y-3">
          {/* Campo para nova conversa (Thread Pai) no topo */}
          <div className="border-b border-zinc-100 pb-4 mb-4 relative">
              <UnifiedComposer
                ref={inputRef}
                placeholder="Escreva um comentário (/tarefa, /anexo, @mencionar)"
                onChange={(val)=> setInput(val.text || "")}
                onSubmit={async (val: ComposerValue)=>{
                  try {
                    await addComment(cardId, (val.text||'').trim());
                    // Limpa o campo visualmente e o estado após envio
                    setInput("");
                    requestAnimationFrame(() => inputRef.current?.setValue({ decision: null, text: "", mentions: [] }));
                  } catch(e:any){
                    alert(e?.message||'Falha ao enviar comentário');
                  }
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
                items={profiles.filter((p) => p.id !== currentUserId && p.full_name.toLowerCase().includes(mentionFilter.toLowerCase()))}
                onPick={(p) => {
                  inputRef.current?.insertMention({ id: p.id, label: p.full_name });
                  setMentionOpen(false);
                  setMentionFilter("");
                }}
              />
              </div>
            )}
          </div>

          {loading && <div className="text-xs text-zinc-500">Carregando…</div>}
          {/* Anexos do card (sem vínculo a um comentário específico) */}
          {!loading && attachments.filter((a) => a.isCardRoot).length > 0 && (
             <div className="space-y-3 mb-3">
               {attachments
                 .filter((a) => a.isCardRoot)
                 .map((att) => {
                  const threadCommentId = att.comment_id ?? null;
                  // Buscar TODOS os descendentes do anexo (não apenas filhos diretos)
                  const attachmentReplies = threadCommentId
                    ? (() => {
                        const allDescendants: Comment[] = [];
                        const findDescendants = (parentId: string) => {
                          const directChildren = comments.filter((c) => c.parent_id === parentId);
                          directChildren.forEach((child) => {
                            allDescendants.push(child);
                            findDescendants(child.id); // Recursivamente buscar filhos
                          });
                        };
                        findDescendants(threadCommentId);
                        return buildTree(allDescendants as any);
                      })()
                    : [];
                  // Busca nome e role via FK (profiles) - primário
                  const profile = att.author_id ? profilesById.get(att.author_id) : undefined;
                  const authorName = profile?.full_name 
                    ?? (att.author_id && att.author_id === currentUserId ? currentUserName : "Colaborador");
                  const authorRole = profile?.role ?? null;
                  return (
                    <div key={att.id} className="space-y-2">
                      <AttachmentMessage
                        att={att}
                        authorName={authorName}
                        authorRole={authorRole}
                        ensureThread={ensureAttachmentComment}
                        onReply={(parentId, value) => submitComment(parentId, value)}
                        onOpenTask={onOpenTask}
                        onOpenAttach={onOpenAttach}
                        profiles={profiles}
                        onPreview={(payload) => setPreview(payload)}
                        currentUserId={currentUserId}
                        onDelete={removeAttachmentWithRefresh}
                      />
                      {attachmentReplies.length > 0 && (
                        <div className="ml-6 space-y-2 mt-2">
          {attachmentReplies.map((replyNode) => (
            <CommentItem
              key={replyNode.id}
              node={replyNode}
              depth={1}
                              onReply={async (id, text) => {
                                try {
                                  await addComment(cardId, text, id);
                                  await refreshComments();
                                } catch (e: any) {
                                  alert(e?.message || "Falha ao enviar comentário");
                                }
                              }}
                              onEdit={editCommentWithRefresh}
                              onDelete={deleteCommentWithRefresh}
              onOpenAttach={onOpenAttach}
              onOpenTask={onOpenTask}
              tasks={tasks}
              attachments={attachments}
              onToggleTask={toggleTaskWithRefresh}
              profiles={profiles}
              currentUserName={currentUserName}
              currentUserId={currentUserId}
              onEditTask={onEditTask}
              onSubmitComment={submitComment}
              onPreview={(payload) => setPreview(payload)}
              applicantName={applicantName}
              comments={comments}
              onDeleteAttachment={removeAttachmentWithRefresh}
            />
          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
           )}
          {!loading && comments.length === 0 && <div className="text-xs text-zinc-500">Nenhuma conversa iniciada</div>}
          {/* LEI 2 - CONTEÚDO: Renderização unificada - Texto, Tarefa, Anexo aparecem juntos */}
          {/* LEI 3 - ORDEM E UX: Threads pai em ordem cronológica */}
          {conversationTree.map((n) => (
            <CommentItem
              key={n.id}
              node={n}
              depth={0}
              onReply={async (id, text) => {
                try {
                  await addComment(cardId, text, id);
                  await refreshComments();
                } catch (e: any) {
                  alert(e?.message || "Falha ao enviar comentário");
                }
              }}
              onEdit={editCommentWithRefresh}
              onDelete={deleteCommentWithRefresh}
              onOpenAttach={onOpenAttach}
              onOpenTask={onOpenTask}
              tasks={tasks}
              attachments={attachments}
              onToggleTask={toggleTaskWithRefresh}
              profiles={profiles}
              currentUserName={currentUserName}
              currentUserId={currentUserId}
              onEditTask={onEditTask}
              onSubmitComment={submitComment}
              onPreview={(payload) => setPreview(payload)}
              applicantName={applicantName}
              comments={comments}
              onDeleteAttachment={removeAttachmentWithRefresh}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * LEI 1 - HIERARQUIA: Filtra automaticamente comentários órfãos (parent_id inválido)
 * LEI 1: Toda resposta aponta para uma Pai e toda sub-resposta aponta para uma resposta ou outra Sub-resposta
 * LEI 3 - ORDEM E UX: Ordena cronologicamente e agrupa respostas no pai
 */
function buildTree(notes: Comment[]): any[] {
  const byId = new Map<string, any>();
  notes.forEach((n) => byId.set(n.id, { ...n, children: [] as any[] }));
  const roots: any[] = [];
  notes.forEach((n) => {
    const node = byId.get(n.id)!;
    if ((n as any).deleted_at) return;
    // LEI 1: Só adiciona como filho se parent_id existe e é válido
    // Isso permite: Resposta → Pai, Sub-resposta → Resposta, Sub-resposta → Sub-resposta
    if (n.parent_id && byId.has(n.parent_id)) {
      // LEI 3: Respostas e sub-respostas grudadas no pai/resposta/sub-resposta
      byId.get(n.parent_id).children.push(node);
    } else if (!n.parent_id) {
      // LEI 1: Sem parent_id = thread pai (só adiciona como raiz se realmente não tem pai)
      roots.push(node);
    }
    // Se tem parent_id mas o pai não existe (órfão), não adiciona em lugar nenhum
    // Isso garante que respostas e sub-respostas NUNCA apareçam fora da hierarquia
  });
  // LEI 3: Ordenação cronológica (mais antigo primeiro)
  const sortFn = (a: any, b: any) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
  const sortTree = (arr: any[]) => {
    arr.sort(sortFn);
    // LEI 3: Ordena recursivamente todos os níveis (sub-respostas grudadas na resposta/sub-resposta)
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

const openReplyMap = new Map<string, boolean>();
const AUTO_TASK_COMMENT_RE = /^📋\s*Tarefa criada\s*:\s*/i;

function CommentItem({ node, depth, onReply, onEdit, onDelete, onOpenAttach, onOpenTask, tasks, attachments, onToggleTask, profiles, currentUserName, currentUserId, onEditTask, onSubmitComment, onPreview, applicantName, comments, onDeleteAttachment }: { node: any; depth: number; onReply: (parentId: string, text: string) => Promise<any>; onEdit: (id: string, text: string) => Promise<any>; onDelete: (id: string) => Promise<any>; onOpenAttach: (parentId?: string) => void; onOpenTask: (parentId?: string) => void; tasks: CardTask[]; attachments: CardAttachment[]; onToggleTask: (id: string, done: boolean) => Promise<any>; profiles: ProfileLite[]; currentUserName: string; currentUserId?: string | null; onEditTask?: (taskId: string) => void; onSubmitComment: (parentId: string | null, value: ComposerValue) => Promise<void>; onPreview: (payload: PreviewTarget) => void; applicantName?: string | null; comments: Comment[]; onDeleteAttachment?: (id: string) => Promise<void>; }) {
  const [isEditing, setIsEditing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(openReplyMap.get(node.id) ?? false);
  const editRef = useRef<HTMLDivElement | null>(null);
  const replyRef = useRef<HTMLDivElement | null>(null);
  const replyComposerRef = useRef<UnifiedComposerHandle | null>(null);
  const editComposerRef = useRef<UnifiedComposerHandle | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (isEditing && editRef.current && t && !editRef.current.contains(t)) {
        setIsEditing(false);
      }
      if (replyOpen && replyRef.current && t && !replyRef.current.contains(t)) {
        openReplyMap.set(node.id, false);
        setReplyOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isEditing, replyOpen, node.id]);
  const [text, setText] = useState(node.text || "");
  const [reply, setReply] = useState("");
  const [mentionOpen2, setMentionOpen2] = useState(false);
  const [mentionFilter2, setMentionFilter2] = useState("");
  const [cmdOpen2, setCmdOpen2] = useState(false);
  const [cmdQuery2, setCmdQuery2] = useState("");
  // Compositor Unificado - edição
  const [editMentionOpen, setEditMentionOpen] = useState(false);
  const [editMentionFilter, setEditMentionFilter] = useState("");
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState("");
  const [editCmdAnchor, setEditCmdAnchor] = useState<{top:number;left:number}>({ top: 0, left: 0 });
  const ts = node.created_at ? new Date(node.created_at).toLocaleString() : "";
  const rawText = node.text ?? "";
  const trimmedText = rawText.trim();
  // Filtrar dados para este nó específico
  const nodeTasks = useMemo(() => (tasks || []).filter((t) => t.comment_id === node.id), [tasks, node.id]);
  const nodeAttachments = useMemo(() => (attachments || []).filter((a) => a.comment_id === node.id), [attachments, node.id]);
  const hasTasks = nodeTasks.length > 0;
  const authorDisplayName = (node.author_name || "").trim() || "Um colaborador";
  const isAutoTaskComment = hasTasks && AUTO_TASK_COMMENT_RE.test(trimmedText);
  const assigneeId = (nodeTasks.find((t) => t.assigned_to)?.assigned_to as string | undefined) || null;
  const assigneeName = assigneeId ? (profiles.find((p) => p.id === assigneeId)?.full_name || "um colaborador") : "um colaborador";
  const displayText =
    trimmedText.length === 0
      ? ""
      : isAutoTaskComment
      ? `${authorDisplayName} criou uma tarefa para "${assigneeName}".`
      : node.text || "";
  function openReply() {
    openReplyMap.set(node.id, true);
    setReplyOpen(true);
    requestAnimationFrame(() => replyComposerRef.current?.focus());
  }
  useEffect(() => {
    if (!replyOpen) {
      setCmdOpen2(false);
      return;
    }
    const m = reply.match(/\/([\w]*)$/);
    if (m) {
      setCmdQuery2((m[1] || "").toLowerCase());
      setCmdOpen2(true);
    } else {
      setCmdOpen2(false);
    }
  }, [reply, replyOpen]);
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
          <button aria-label="Responder" onClick={openReply} className="text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M4 12h16M12 4l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {currentUserId && node.author_id === currentUserId ? (
            <CommentMenu onEdit={()=> setIsEditing(true)} onDelete={async ()=> { if (confirm('Excluir este comentário?')) { try { await onDelete(node.id); } catch(e:any){ alert(e?.message||'Falha ao excluir'); } } }} />
          ) : null}
        </div>
      </div>
      {!isEditing ? (
        displayText.trim().length === 0 ? null : (
          <div className="mt-1 break-words">{renderTextWithChips(displayText)}</div>
        )
      ) : (
        <div className="mt-2" ref={editRef}>
          <div className="relative">
            <ComposerHeader name={currentUserName} />
            <UnifiedComposer
              ref={editComposerRef}
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
                  items={(profiles || []).filter((p)=> p.id !== currentUserId && (p.full_name||'').toLowerCase().includes(editMentionFilter.toLowerCase()))}
                  onPick={(p)=>{
                  editComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                    setEditMentionOpen(false);
                  setEditMentionFilter("");
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
      {/* LEI 1 - HIERARQUIA: Tarefas como respostas com estrutura visual unificada */}
      {nodeTasks && nodeTasks.length > 0 && (
        <div className="mt-2 space-y-2">
          {nodeTasks.map((t) => {
            const creatorProfile = t.created_by ? profiles.find((p) => p.id === t.created_by) : null;
            const creatorName =
              creatorProfile?.full_name ??
              (t.created_by && t.created_by === currentUserId ? currentUserName : "Colaborador");
            const creatorRole = creatorProfile?.role ?? null;
            // Buscar o comentário vinculado para pegar created_at (se existir)
            const taskComment = comments.find((c) => c.id === t.comment_id);
            const created_at = taskComment?.created_at || t.created_at;
            
            return (
              <TaskResponseCard
                key={t.id}
                task={t}
                onToggle={async (id, done) => {
                  try {
                    await onToggleTask(id, done);
                  } catch (e: any) {
                    alert(e?.message || "Falha ao atualizar tarefa");
                  }
                }}
                creatorName={creatorName}
                creatorRole={creatorRole}
                created_at={created_at}
                applicantName={applicantName}
                onEdit={onEditTask ? () => onEditTask(t.id) : undefined}
                currentUserId={currentUserId}
                depth={depth}
              />
            );
          })}
        </div>
      )}
      {/* LEI 1 - HIERARQUIA: Anexos como respostas com estrutura visual unificada */}
      {nodeAttachments && nodeAttachments.length > 0 && (
        <div className="mt-2 space-y-2">
          {nodeAttachments.map((a) => {
            const attachmentProfile = a.author_id ? profiles.find((p) => p.id === a.author_id) : null;
            const authorName = attachmentProfile?.full_name ?? (a.author_id && a.author_id === currentUserId ? currentUserName : "Colaborador");
            const authorRole = attachmentProfile?.role ?? a.author_role ?? null;
            
            return (
              <AttachmentResponseRow
                key={a.id}
                att={a}
                authorName={authorName}
                authorRole={authorRole}
                onPreview={onPreview}
                currentUserId={currentUserId}
                onDelete={onDeleteAttachment}
                depth={depth}
              />
            );
          })}
        </div>
      )}
      {replyOpen && (
        <div className="mt-2 flex gap-2 items-start relative" ref={replyRef}>
          <div className="flex-1">
            <UnifiedComposer
              ref={replyComposerRef}
              defaultValue={{ decision: null, text: reply }}
              placeholder="Responder... (/tarefa, /anexo, @mencionar)"
              onChange={(val)=> setReply(val.text || "")}
              onSubmit={async (val)=>{
                await onSubmitComment(node.id, val);
                setReply("");
                openReplyMap.set(node.id, false);
                setReplyOpen(false);
              }}
              onCancel={()=> { openReplyMap.set(node.id, false); setReplyOpen(false); setMentionOpen2(false); setCmdOpen2(false); }}
              onMentionTrigger={(query)=> {
                setMentionFilter2((query||'').trim());
                setMentionOpen2(true);
              }}
              onMentionClose={()=> setMentionOpen2(false)}
              onCommandTrigger={(query)=> {
                setCmdQuery2((query||'').toLowerCase());
                setCmdOpen2(true);
              }}
              onCommandClose={()=>{
                if (reply.match(/\/([\w]*)$/)) {
                  setCmdOpen2(true);
                } else {
                  setCmdOpen2(false);
                }
              }}
            />
            {mentionOpen2 && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
              <MentionDropdown
                items={profiles.filter((p) => p.id !== currentUserId && p.full_name.toLowerCase().includes(mentionFilter2.toLowerCase()))}
                onPick={(p) => {
                  replyComposerRef.current?.insertMention({ id: p.id, label: p.full_name });
                  setMentionOpen2(false);
                  setMentionFilter2("");
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
      {/* LEI 1 - HIERARQUIA: Renderização recursiva de sub-respostas
          Permite encadeamento infinito: Pai → Resposta → Sub-resposta → Sub-sub-resposta...
          Cada nível aumenta depth + 1 para indentação visual */}
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
              tasks={tasks}
              attachments={attachments}
              onToggleTask={onToggleTask}
              profiles={profiles}
              currentUserName={currentUserName}
              currentUserId={currentUserId}
              onEditTask={onEditTask}
              onSubmitComment={onSubmitComment}
              onPreview={onPreview}
              applicantName={applicantName}
              comments={comments}
              onDeleteAttachment={onDeleteAttachment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * LEI 1 - HIERARQUIA: Estrutura visual unificada para respostas
 * Tarefas e Anexos como respostas devem ter a mesma estrutura visual que comentários de texto
 * (Nome do autor + Data/hora + Role abaixo + Borda verde)
 */
function TaskResponseCard({ 
  task, 
  onToggle, 
  creatorName, 
  creatorRole,
  created_at,
  onEdit,
  applicantName,
  currentUserId,
  depth = 0
}: { 
  task: CardTask; 
  onToggle: (id: string, done: boolean) => void | Promise<void>; 
  creatorName?: string | null;
  creatorRole?: string | null;
  created_at?: string | null;
  onEdit?: () => void;
  applicantName?: string | null;
  currentUserId?: string | null;
  depth?: number;
}) {
  const ts = created_at ? new Date(created_at).toLocaleString() : "";
  
  return (
    <div 
      className="comment-card rounded-lg pl-3" 
      style={{ 
        borderLeftColor: 'var(--verde-primario)', 
        borderLeftWidth: '8px' 
      }}
    >
      {/* LEI 1 - HIERARQUIA: Header unificado - mesma estrutura de CommentItem */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-medium comment-author text-zinc-900">
              {creatorName || "Colaborador"} <span className="comment-timestamp">{ts}</span>
            </div>
            {creatorRole && <div className="text-[11px] text-zinc-900 truncate">{creatorRole}</div>}
          </div>
        </div>
      </div>
      {/* Conteúdo da tarefa */}
      <div className="mt-2">
        <TaskCard task={task} onToggle={onToggle} creatorName={creatorName} applicantName={applicantName} onEdit={onEdit} currentUserId={currentUserId} />
      </div>
    </div>
  );
}

function AttachmentResponseRow({ 
  att, 
  authorName,
  authorRole,
  onPreview, 
  currentUserId,
  onDelete,
  depth = 0
}: { 
  att: CardAttachment; 
  authorName?: string | null;
  authorRole?: string | null;
  onPreview?: (payload: PreviewTarget) => void; 
  currentUserId?: string | null;
  onDelete?: (id: string) => Promise<void>;
  depth?: number;
}) {
  const ts = att.created_at ? new Date(att.created_at).toLocaleString() : "";
  
  return (
    <div 
      className="comment-card rounded-lg pl-3" 
      style={{ 
        borderLeftColor: 'var(--verde-primario)', 
        borderLeftWidth: '8px' 
      }}
    >
      {/* LEI 1 - HIERARQUIA: Header unificado - mesma estrutura de CommentItem */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-medium comment-author text-zinc-900">
              {authorName || "Colaborador"} <span className="comment-timestamp">{ts}</span>
            </div>
            {authorRole && <div className="text-[11px] text-zinc-900 truncate">{authorRole}</div>}
          </div>
        </div>
      </div>
      {/* Conteúdo do anexo */}
      <div className="mt-2">
        <AttachmentContent
          att={{ ...att, isCardRoot: false }}
          currentUserId={currentUserId}
          onDelete={onDelete ? async () => {
            try {
              await onDelete(att.id);
            } catch (e: any) {
              alert(e?.message || "Falha ao excluir anexo");
            }
          } : undefined}
          onPreview={onPreview}
        />
      </div>
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

function AttachmentContent({ att, onDelete, onPreview, currentUserId }: { att: CardAttachmentWithMeta; onDelete?: () => Promise<void>; onPreview?: (payload: PreviewTarget) => void; currentUserId?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  // Não gera URL automaticamente para evitar chamadas 400; gera on-demand
  const ts = att.created_at ? new Date(att.created_at).toLocaleString() : "";
  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-zinc-200 bg-white px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-lg shrink-0">{iconFor(att.file_type || "")}</span>
        <div className="min-w-0 flex-1">
          <div className="font-medium break-words">{att.file_name}</div>
          <div className="text-[11px] text-zinc-500">{ts}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="flex h-8 w-8 items-center justify-center text-zinc-600 hover:text-zinc-900 shrink-0"
          title="Visualizar"
          onClick={async () => {
            try {
              const link = await getAttachmentUrl(att.id, 'preview');
              if (!link) { alert('Não foi possível gerar o link do anexo.'); return; }
              setUrl(link);
              onPreview?.({ url: link, mime: att.file_type ?? undefined, name: att.file_name, extension: att.file_extension ?? undefined });
            } catch { alert('Não foi possível gerar o link do anexo.'); }
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M1.5 12s3.5-6 10.5-6 10.5 6 10.5 6-3.5 6-10.5 6S1.5 12 1.5 12z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          </svg>
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center text-zinc-600 hover:text-zinc-800 shrink-0"
          title="Abrir anexo"
          onClick={async () => {
            try {
              const link = await getAttachmentUrl(att.id, 'download');
              if (!link) { alert('Não foi possível abrir o anexo.'); return; }
              setUrl(link);
              window.open(link, '_blank');
            } catch { alert('Não foi possível abrir o anexo.'); }
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
        {currentUserId && att.author_id === currentUserId && (
          <button
            className="flex h-8 w-8 items-center justify-center text-zinc-600 hover:text-red-600 shrink-0"
            title="Excluir anexo"
            onClick={async () => {
              if (!onDelete) return;
              if (confirm("Excluir este anexo?")) {
                await onDelete();
              }
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-3h4m-4 0a1 1 0 00-1 1v1h6V5a1 1 0 00-1-1m-4 0h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function AttachmentRow({ att, onPreview, currentUserId }: { att: CardAttachment; onPreview?: (payload: PreviewTarget) => void; currentUserId?: string | null }) {
  return (
    <AttachmentContent
      att={{ ...att, isCardRoot: false }}
      currentUserId={currentUserId}
      onDelete={async () => {
        if (confirm("Excluir este anexo?")) {
          try {
            await removeAttachment(att.id);
          } catch (e: any) {
            alert(e?.message || "Falha ao excluir anexo");
          }
        }
      }}
      onPreview={onPreview}
    />
  );
}

function AttachmentMessage({ att, authorName, authorRole, ensureThread, onReply, onOpenTask, onOpenAttach, profiles, onPreview, currentUserId, onDelete }: { att: CardAttachmentWithMeta; authorName: string; authorRole?: string | null; ensureThread: (att: CardAttachmentWithMeta) => Promise<string>; onReply: (parentId: string, value: ComposerValue) => Promise<void>; onOpenTask: (parentId?: string) => void; onOpenAttach: (parentId?: string) => void; profiles: ProfileLite[]; onPreview: (payload: PreviewTarget) => void; currentUserId?: string | null; onDelete?: (id: string) => Promise<void> }) {
  const createdAt = att.created_at ? new Date(att.created_at).toLocaleString() : "";
  const [replying, setReplying] = useState(false);
  const replyRef = useRef<UnifiedComposerHandle | null>(null);
  const replyContainerRef = useRef<HTMLDivElement | null>(null);
  const [replyValue, setReplyValue] = useState<ComposerValue>({ decision: null, text: "", mentions: [] });
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (value: ComposerValue) => {
    const text = (value.text || "").trim();
    if (!text) return;
    const commentId = await ensureThread(att);
    await onReply(commentId, value);
    setReplyValue({ decision: null, text: "", mentions: [] });
    setReplying(false);
  };

  useEffect(() => {
    if (!replying) return;
    function onDocDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (replyContainerRef.current && target && !replyContainerRef.current.contains(target)) {
        setReplying(false);
        setMentionOpen(false);
        setCmdOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [replying]);

  return (
    <div
      className="comment-card rounded-lg border border-emerald-100 bg-emerald-50/40 p-3"
      style={{ borderLeftColor: "var(--verde-primario)", borderLeftWidth: "8px", borderLeftStyle: "solid" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-medium text-zinc-900">{authorName || "Colaborador"} <span className="comment-timestamp">{createdAt}</span></div>
            {authorRole && <div className="text-[11px] text-zinc-700 truncate">{authorRole}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Responder"
            onClick={() => {
              setReplying(true);
              requestAnimationFrame(() => replyRef.current?.focus());
            }}
            className="text-zinc-500 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M4 12h16M12 4l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {currentUserId && att.author_id === currentUserId && (
            <CommentMenu
              onEdit={() => alert("Anexos do card não podem ser editados diretamente.")}
              onDelete={onDelete ? async () => {
                try {
                  await onDelete(att.id);
                } catch (e: any) {
                  alert(e?.message || 'Falha ao excluir anexo');
                }
              } : async () => {}}
            />
          )}
        </div>
      </div>
      <div className="mt-3">
        <AttachmentContent
          att={att}
          currentUserId={currentUserId}
          onDelete={onDelete ? async () => {
            try {
              await onDelete(att.id);
            } catch (e: any) {
              alert(e?.message || "Falha ao excluir anexo");
            }
          } : undefined}
          onPreview={onPreview}
        />
      </div>
      {replying && (
        <div className="mt-3 relative" ref={replyContainerRef}>
            <UnifiedComposer
            ref={replyRef}
            placeholder="Responder... (/tarefa, /anexo, @mencionar)"
            defaultValue={replyValue}
            onChange={(val) => setReplyValue(val)}
            onSubmit={handleSubmit}
            onCancel={() => {
              setReplying(false);
              setReplyValue({ decision: null, text: "", mentions: [] });
              setMentionOpen(false);
              setCmdOpen(false);
            }}
            onMentionTrigger={(query, rect) => {
              setMentionFilter((query || "").trim());
              setMentionOpen(true);
            }}
            onMentionClose={() => setMentionOpen(false)}
            onCommandTrigger={(query, rect) => {
              setCmdQuery((query || "").toLowerCase());
              setCmdOpen(true);
            }}
            onCommandClose={() => setCmdOpen(false)}
          />
          {mentionOpen && (
            <div className="absolute left-0 bottom-full mb-2">
              <MentionDropdown
                items={profiles.filter((p) => (p.full_name || '').toLowerCase().includes(mentionFilter.toLowerCase()))}
                onPick={(p) => {
                  replyRef.current?.insertMention({ id: p.id, label: p.full_name });
                  setMentionOpen(false);
                  setMentionFilter("");
                }}
              />
          </div>
        )}
          {cmdOpen && (
            <div className="absolute left-0 bottom-full mb-2">
              <CmdDropdown
                items={[{ key:'tarefa', label:'Tarefa' }, { key:'anexo', label:'Anexo' }].filter((i)=> i.key.includes(cmdQuery))}
                onPick={(key)=> {
                  if (key==='tarefa') onOpenTask();
                  if (key==='anexo') onOpenAttach();
                  setCmdOpen(false); setCmdQuery('');
                }}
                initialQuery={cmdQuery}
              />
      </div>
          )}
        </div>
      )}
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
