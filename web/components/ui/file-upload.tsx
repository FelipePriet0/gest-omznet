"use client";
import { cn } from "@/lib/utils";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  IconUpload,
  IconX,
  IconFile,
  IconFileTypePdf,
  IconPhoto,
  IconFileTypeDoc,
  IconFileTypeXls,
  IconFileZip,
  IconExternalLink,
  IconDotsVertical,
  IconTrash,
} from "@tabler/icons-react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex shrink-0 scale-105 flex-wrap items-center justify-center gap-x-px gap-y-px bg-gray-100">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`flex h-10 w-10 shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50"
                  : "bg-gray-50 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}

export function FileUploadDropzone({
  children,
  onFiles,
  disabled,
  accept,
  className,
  style,
}: {
  children: React.ReactNode;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  accept?: DropzoneOptions["accept"];
  className?: string;
  style?: React.CSSProperties;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    disabled,
    accept,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div {...getRootProps()} className={cn("relative", className)} style={style}>
      <input {...getInputProps()} />
      {children}
      {isDragActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 rounded-[2px] overflow-hidden flex items-center justify-center pointer-events-none"
        >
          <div className="absolute inset-0 opacity-75 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
            <GridPattern />
          </div>
          <div className="absolute inset-0 rounded-[2px] border-2 border-dashed border-[var(--verde-primario)]" />
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 flex flex-col items-center gap-1.5 bg-white/95 rounded-lg px-5 py-3 shadow-lg"
          >
            <IconUpload className="h-6 w-6" style={{ color: "var(--verde-primario)" }} />
            <span className="text-xs font-semibold text-zinc-700">Solte os arquivos aqui</span>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function fileIcon(fileType?: string | null, fileExt?: string | null) {
  const type = fileType || "";
  const ext = (fileExt || "").toLowerCase();
  if (type.startsWith("image/")) return <IconPhoto className="w-5 h-5 shrink-0 text-blue-500" />;
  if (type === "application/pdf" || ext === "pdf")
    return <IconFileTypePdf className="w-5 h-5 shrink-0 text-red-500" />;
  if (type.includes("word") || ext === "doc" || ext === "docx")
    return <IconFileTypeDoc className="w-5 h-5 shrink-0 text-blue-600" />;
  if (type.includes("excel") || type.includes("spreadsheet") || ext === "xls" || ext === "xlsx")
    return <IconFileTypeXls className="w-5 h-5 shrink-0 text-green-600" />;
  if (type.includes("zip") || type.includes("rar") || ext === "zip" || ext === "rar")
    return <IconFileZip className="w-5 h-5 shrink-0 text-amber-500" />;
  return <IconFile className="w-5 h-5 shrink-0 text-zinc-400" />;
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} minuto${mins > 1 ? "s" : ""}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs} hora${hrs > 1 ? "s" : ""}`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? "es" : ""}`;
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentChip({
  name,
  fileType,
  fileExt,
  onRemove,
  onClick,
  removing,
  createdAt,
}: {
  name: string;
  fileType?: string | null;
  fileExt?: string | null;
  fileSize?: number | null;
  onRemove?: () => void;
  onClick?: () => void | Promise<void>;
  removing?: boolean;
  createdAt?: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: removing ? 0.4 : 1, scale: 1 }}
        layout
        className="flex items-center gap-3 rounded border border-zinc-200 bg-white px-3 py-2 shadow-sm"
      >
        {fileIcon(fileType, fileExt)}

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-zinc-800 truncate">{name}</div>
          {createdAt && (
            <div className="text-[10px] text-zinc-400 mt-0.5">{timeAgo(createdAt)}</div>
          )}
        </div>

        {onClick && (
          <button
            type="button"
            onClick={onClick}
            disabled={removing}
            className="shrink-0 text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-40"
            aria-label="Abrir arquivo"
            title="Abrir em nova aba"
          >
            <IconExternalLink className="w-4 h-4" />
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={removing}
            className="shrink-0 text-zinc-400 hover:text-red-600 transition-colors p-0.5 rounded disabled:opacity-40"
            aria-label="Excluir anexo"
            title="Excluir anexo"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {onRemove && (
        <ConfirmDialog
          open={confirmOpen}
          title="⚠️ Confirmar Exclusão"
          description={`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() => { setConfirmOpen(false); onRemove(); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

export function PendingFileChip({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      layout
      className="flex items-center gap-3 rounded border border-zinc-200 bg-white px-3 py-2 shadow-sm"
    >
      {fileIcon(file.type)}

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-zinc-800 truncate">{file.name}</div>
        <div className="text-[10px] text-zinc-400 mt-0.5">pendente</div>
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="text-zinc-400 hover:text-zinc-700 transition-colors p-0.5 rounded"
          aria-label="Mais opções"
        >
          <IconDotsVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-6 z-[9999] w-44 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 overflow-hidden">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onRemove(); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <IconX className="w-4 h-4 shrink-0" />
                Remover
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
