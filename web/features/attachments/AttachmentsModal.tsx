"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FileItem = { id: string; file: File; name: string; size: number; type: string };

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = [
  // imagens
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
  // docs
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip", "application/x-rar-compressed", "application/vnd.rar", "application/x-zip-compressed"
];

export function AttachmentsModal({ open, onClose, cardId, commentId, onCompleted }: { open: boolean; onClose: () => void; cardId: string; commentId?: string | null; onCompleted?: (files: { name: string; path: string }[]) => void }) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.currentTarget.value = "";
  }

  function addFiles(files: File[]) {
    const existKeys = new Set(items.map((i) => `${i.file.name}-${i.size}`));
    const next: FileItem[] = [];
    for (const f of files) {
      const key = `${f.name}-${f.size}`;
      if (existKeys.has(key)) continue;
      next.push({ id: crypto.randomUUID(), file: f, name: "", size: f.size, type: f.type });
    }
    setItems((prev) => [...prev, ...next]);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    addFiles(files);
  }

  const invalids = useMemo(() => {
    const badSize = items.filter((i) => i.size > MAX_SIZE).map((i) => i.id);
    const badType = items.filter((i) => i.type && !ALLOWED.includes(i.type)).map((i) => i.id);
    const noName = items.filter((i) => !i.name.trim()).map((i) => i.id);
    return { badSize: new Set(badSize), badType: new Set(badType), noName: new Set(noName) };
  }, [items]);

  async function uploadAll() {
    if (items.length === 0) return;
    if (invalids.badSize.size > 0 || invalids.badType.size > 0 || invalids.noName.size > 0) return;
    setProcessing(true);
    try {
      const uploaded: { name: string; path: string }[] = [];
      for (const it of items) {
        const ext = it.file.name.includes(".") ? it.file.name.split(".").pop() : undefined;
        const clean = slugify(it.name || it.file.name);
        const ts = new Date().toISOString().replaceAll(":", "-");
        const path = `${cardId}/${clean}_${ts}.${ext ?? "bin"}`;
        const { error: upErr } = await supabase.storage.from("card-attachments").upload(path, it.file, { upsert: false });
        if (upErr) throw upErr;
        const { data: meta, error: metaErr } = await supabase
          .from("card_attachments")
          .insert({
            card_id: cardId,
            comment_id: commentId ?? null,
            file_name: it.name || it.file.name,
            description: description || null,
            file_path: path,
            file_size: it.size,
            file_type: it.type || null,
            file_extension: ext || null,
          })
          .select("id")
          .single();
        if (metaErr) throw metaErr;
        uploaded.push({ name: it.name || it.file.name, path });
      }
      // pequeno delay
      await new Promise((r) => setTimeout(r, 700));
      try { onCompleted?.(uploaded); } catch {}
      onClose();
      setItems([]);
      setDescription("");
    } catch (e: any) {
      alert(e?.message ?? "Falha no upload");
    } finally {
      setProcessing(false);
    }
  }

  if (!open) return null;
  const ready = items.length > 0 && invalids.badSize.size === 0 && invalids.badType.size === 0 && invalids.noName.size === 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-xl border bg-white shadow-2xl">
        <header className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 py-4 text-white">
          <div className="text-lg font-semibold flex items-center gap-2">
            <span>📤 Anexar Arquivo</span>
            <span className="ml-auto cursor-pointer" onClick={() => !processing && onClose()}>✕</span>
          </div>
          <div className="text-sm text-white/90">Envie documentos e imagens para a ficha</div>
        </header>
        <div className="p-5 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`grid place-items-center rounded-lg border-2 border-dashed p-8 text-center ${dragOver ? "border-emerald-500 bg-emerald-50" : "border-zinc-300"}`}
          >
            <div className="space-y-2">
              <div className="text-sm text-zinc-700">Arraste e solte arquivos aqui</div>
              <div className="text-xs text-zinc-500">ou</div>
              <button onClick={pick} className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm">Selecionar arquivos</button>
              <input ref={inputRef} type="file" multiple className="hidden" onChange={onPick} />
            </div>
          </div>
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 rounded border px-3 py-2 text-sm">
                  <span className="text-lg">{iconFor(it.type)}</span>
                  <div className="flex-1">
                    <input
                      value={it.name}
                      onChange={(e) => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, name: e.target.value } : p)))}
                      placeholder="Ex: CNH do titular, Comprovante de renda"
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-emerald-500"
                    />
                    <div className="text-[11px] text-zinc-500">{fmtSize(it.size)} • {it.type || "—"}</div>
                  </div>
                  <button onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))} className="text-zinc-500 hover:text-zinc-700">✕</button>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-zinc-600">Descrição (opcional)</label>
            <textarea value={description} onChange={(e)=> setDescription(e.target.value)} rows={3} placeholder="Detalhes adicionais (visível aos colaboradores)" className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </div>
          {/* Banners de validação */}
          {!ready && items.length > 0 && (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Por favor, dê um nome para todos os arquivos e verifique tipo/tamanho.
            </div>
          )}
          {ready && (
            <div className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              ✅ Tudo pronto! Todos os arquivos podem ser enviados.
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} disabled={processing} className="rounded border border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          <button onClick={uploadAll} disabled={processing || !ready} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{processing ? "Enviando..." : "Enviar Arquivos"}</button>
        </footer>
      </div>
    </div>
  );
}

function slugify(s: string) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\-_. ]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
}

function fmtSize(n: number) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
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
