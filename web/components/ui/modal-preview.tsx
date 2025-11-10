"use client";

import React, { useMemo } from "react";

export type PreviewTarget = {
  url: string;
  mime?: string | null;
  name?: string | null;
  extension?: string | null;
};

function isImage(mime?: string | null) {
  return mime?.startsWith("image/");
}

function isVideo(mime?: string | null) {
  return mime?.startsWith("video/");
}

function isAudio(mime?: string | null) {
  return mime?.startsWith("audio/");
}

function isPdf(mime?: string | null, ext?: string | null) {
  if (mime === "application/pdf") return true;
  return (ext ?? "").toLowerCase() === "pdf";
}

function isOfficeDoc(mime?: string | null, ext?: string | null) {
  const target = `${mime ?? ""}|${(ext ?? "").toLowerCase()}`;
  return /word|excel|powerpoint|officedocument/.test(target) || /(doc|docx|xls|xlsx|ppt|pptx)$/i.test(ext ?? "");
}

export function ModalPreview({ file, onClose }: { file: PreviewTarget | null; onClose: () => void }) {
  const content = useMemo(() => {
    if (!file) return null;
    const { url, mime, extension, name } = file;
    if (isImage(mime)) {
      return <img src={url} alt={name ?? "Pré-visualização"} className="h-full w-full object-contain" />;
    }
    if (isVideo(mime)) {
      return <video src={url} controls className="h-full w-full rounded-xl bg-black" />;
    }
    if (isAudio(mime)) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <audio src={url} controls className="w-full max-w-2xl" />
        </div>
      );
    }
    if (isPdf(mime, extension)) {
      return <iframe src={url} title={name ?? "Pré-visualização PDF"} className="h-full w-full" style={{ border: "none" }} />;
    }
    if (isOfficeDoc(mime, extension)) {
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      return <iframe src={officeUrl} title={name ?? "Pré-visualização Office"} className="h-full w-full" style={{ border: "none" }} />;
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-zinc-600">
          Não conseguimos pré-visualizar este tipo de arquivo.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Abrir em nova aba
        </a>
      </div>
    );
  }, [file]);

  if (!file) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex h-[80vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div className="min-w-0 pr-4">
            <div className="truncate text-sm font-medium text-zinc-900">{file.name ?? "Pré-visualização"}</div>
            {file.mime && <div className="text-xs text-zinc-500">{file.mime}</div>}
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-zinc-600 hover:text-zinc-900 hover:bg-white"
            onClick={onClose}
            aria-label="Fechar pré-visualização"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-hidden rounded-b-2xl bg-zinc-50">
          {content}
        </div>
      </div>
    </div>
  );
}
