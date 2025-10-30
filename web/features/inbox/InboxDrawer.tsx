"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { listInbox, markRead, type InboxItem } from "@/features/inbox/services";
import { isOnline } from "@/lib/utils";

export function InboxBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const unread = useMemo(() => items.filter(i => !i.read_at).length, [items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setUid(data.user?.id ?? null);
        if (isOnline()) setItems(await listInbox());
      } catch {
        // Silencia erros de rede em dev/offline
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!uid || !isOnline()) return;
    const ch = supabase
      .channel(`inbox-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_notifications", filter: `user_id=eq.${uid}` }, async () => {
        try { setItems(await listInbox()); } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(true)} className="relative grid h-8 w-8 place-items-center rounded-full border border-zinc-300 text-lg hover:bg-zinc-50">
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">{unread}</span>
        )}
      </button>
      {open && (
        <InboxDrawer items={items} onClose={() => setOpen(false)} onRefresh={async ()=> setItems(await listInbox())} />
      )}
    </div>
  );
}

function InboxDrawer({ items, onClose, onRefresh }: { items: InboxItem[]; onClose: () => void; onRefresh: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-center justify-between bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">Caixa de Entrada (🔔)</div>
          <button className="rounded border border-white/30 px-2 py-1 text-xs" onClick={onClose}>Fechar</button>
        </header>
        <div className="max-h-[70vh] overflow-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">Sem notificações</div>
          ) : (
            items.map((n) => <InboxRow key={n.id} n={n} onRefresh={onRefresh} />)
          )}
        </div>
      </div>
    </div>
  );
}

function InboxRow({ n, onRefresh }: { n: InboxItem; onRefresh: () => void }) {
  const when = n.created_at ? new Date(n.created_at).toLocaleString() : '';
  const icon = n.type === 'task' ? '📋' : n.type === 'comment' ? '💬' : n.type === 'card' ? '🔥' : '🔔';
  const isUnread = !n.read_at;
  return (
    <div className={`flex items-start gap-3 rounded border px-3 py-2 ${isUnread? 'border-emerald-200 bg-emerald-50':'border-zinc-200 bg-white'}`}>
      <div className="text-xl leading-none pt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="truncate text-sm font-semibold">{n.title || 'Notificação'}</div>
          <div className="text-[11px] text-zinc-500">{when}</div>
        </div>
        {n.body && <div className="mt-0.5 text-sm text-zinc-700">{n.body}</div>}
        <div className="mt-2 flex items-center gap-2 text-xs">
          {isUnread && <button className="rounded border border-zinc-300 px-2 py-0.5" onClick={async ()=> { try { await markRead(n.id); onRefresh(); } catch {} }}>Marcar como lida</button>}
          {/* Placeholder para abrir links/rotas específicas */}
          {n.link_url && <a href={n.link_url} className="rounded border border-zinc-300 px-2 py-0.5">Abrir</a>}
        </div>
      </div>
    </div>
  );
}
