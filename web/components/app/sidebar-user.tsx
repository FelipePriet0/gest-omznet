"use client";

import Image from "next/image";
import { ChevronDown, ChevronUp, LogOut, User, UserCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase, hardResetAuth } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

interface SidebarUserProps {
  name?: string;
  email?: string;
  avatar?: string;
}

type ProfileRow = { full_name: string | null; role: string | null };

export const SidebarUser = ({ name, email, avatar }: SidebarUserProps) => {
  const router = useRouter();
  const { open: sidebarOpen } = useSidebar();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState<string | undefined>(email);
  const [profile, setProfile] = useState<ProfileRow>({ full_name: null, role: null });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        const uid = data.user?.id;
        setAuthEmail(data.user?.email || email);
        if (uid) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", uid)
            .single();
          if (!active) return;
          setProfile({ full_name: (prof as any)?.full_name ?? null, role: (prof as any)?.role ?? null });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [email]);

  // Fecha dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent | TouchEvent) {
      if (!open) return;
      const target = e.target as Node | null;
      const insideTrigger = containerRef.current && target && containerRef.current.contains(target);
      const insideMenu = menuRef.current && target && menuRef.current.contains(target);
      if (!insideTrigger && !insideMenu) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayName = useMemo(() => profile.full_name || name || authEmail || "Usuário", [profile.full_name, name, authEmail]);
  const initials = useMemo(() => {
    const n = (profile.full_name || displayName || "").toString();
    const parts = n.trim().split(/\s+/);
    const first = parts[0]?.[0] || "U";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }, [profile.full_name, displayName]);

  async function logout() {
    try {
      await hardResetAuth();
    } finally {
      router.replace("/login");
    }
  }

  // Calcula posição do menu em portal para ficar acima de qualquer margem/overflow
  // Alinhando a BASE do popover com a linha INFERIOR do hover do usuário (estado anterior)
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const rect = el.getBoundingClientRect();
      const mh = menuRef.current?.offsetHeight ?? 0;
      const mw = menuRef.current?.offsetWidth ?? 220;
      let left = rect.right + 8;
      let top = rect.bottom - mh; // base alinhada ao fim do hover do usuário
      const minTop = 8;
      const maxTop = Math.max(minTop, (window.innerHeight || 0) - mh - 8);
      if (!Number.isNaN(top)) {
        top = Math.max(minTop, Math.min(top, maxTop));
      } else {
        top = Math.max(minTop, Math.min(rect.top, maxTop));
      }
      const viewportW = window.innerWidth || 0;
      if (left + mw > viewportW - 8) {
        left = Math.max(8, rect.left - mw - 8);
      }
      setMenuPos({ top, left });
    };

    // posição inicial aproximada antes de medir
    const r0 = el.getBoundingClientRect();
    setMenuPos({ top: r0.top, left: r0.right + 8 });

    const raf = requestAnimationFrame(compute);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open]);

  return (
    <div className="relative flex items-center justify-center" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center rounded-lg hover:bg-white/20 transition-colors",
          sidebarOpen ? "w-full gap-3 p-2" : "p-2",
        ].join(" ")}
        aria-expanded={open}
      >
        {(() => {
          const box = sidebarOpen ? "h-10 w-10" : "h-9 w-9";
          const imgSize = sidebarOpen ? 28 : 24;
          return (
            <div className={[box, "bg-white/30 flex items-center justify-center flex-shrink-0 overflow-hidden"].join(" ")} style={{ borderRadius: '30%' }}>
              {avatar ? (
                <Image src={avatar} alt={displayName} width={imgSize} height={imgSize} className="object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-white">{initials}</span>
              )}
            </div>
          );
        })()}
        {sidebarOpen && (
          <>
            <div className="flex flex-col overflow-hidden text-left">
              <span className="text-sm font-medium text-white truncate">{loading ? "Carregando…" : displayName}</span>
              <span className="text-xs text-white/80 truncate">{profile.role || ""}</span>
            </div>
            <div className="ml-auto text-white/80">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </div>
          </>
        )}
      </button>
      {open && typeof window !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="min-w-[220px] w-fit max-w-[360px] rounded-md bg-white text-zinc-900 shadow-lg border border-black/10 overflow-hidden z-[9999]"
              role="menu"
              aria-label="Opções do usuário"
              style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
            >
              <div className="px-4 py-3 border-b border-zinc-200 bg-white">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-zinc-200 flex items-center justify-center overflow-hidden" style={{ borderRadius: '30%' }}>
                    {avatar ? (
                      <Image src={avatar} alt={displayName} width={24} height={24} className="object-cover" />
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-700">{initials}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{loading ? "Carregando…" : displayName}</span>
                    <span className="text-xs text-zinc-500 truncate">{profile.role || ""}</span>
                  </div>
                </div>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); router.push("/perfil"); }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-zinc-100 transition"
                  role="menuitem"
                >
                  <UserCircle className="h-4 w-4" />
                  Meu perfil
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); logout(); }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-sm text-red-600 hover:bg-red-50 transition"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da conta
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
