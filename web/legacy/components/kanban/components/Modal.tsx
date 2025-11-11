"use client";

import { useEffect, useState } from "react";

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const [leftOffset, setLeftOffset] = useState(0);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const updateLeft = () => {
      try {
        const el = document.getElementById('kanban-page-root');
        const left = el ? Math.max(0, Math.round(el.getBoundingClientRect().left)) : 0;
        setLeftOffset(left);
      } catch { setLeftOffset(0); }
    };
    updateLeft();
    window.addEventListener('resize', updateLeft);
    return () => window.removeEventListener('resize', updateLeft);
  }, [open]);

  if (!open) return null;
  return (
    <>
      {/* Backdrop: abaixo do Drawer/Sidebar (z-40) e acima do Kanban */}
      <div className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-sm" style={{ left: leftOffset }} onClick={onClose} />
      {/* Modal content: acima do Drawer/Sidebar (z-70) */}
      <div className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ left: leftOffset }} onClick={onClose}>
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          {title && <h3 className="mb-4 text-lg font-semibold text-zinc-900">{title}</h3>}
          {children}
        </div>
      </div>
    </>
  );
}
