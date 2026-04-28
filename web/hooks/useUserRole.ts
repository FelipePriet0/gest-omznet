 "use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type UserRole = "vendedor" | "analista" | "gestor" | "instalador" | "leitor";

export function useUserRole({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(autoLoad);

  useEffect(() => {
    if (!autoLoad) return;
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (!active) return;
        setRole((profile?.role as UserRole | null | undefined) ?? null);
        setLoading(false);
      } catch {
        if (!active) return;
        setRole(null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [autoLoad]);

  const isLeitor = role === "leitor";
  return { role, loading, isLeitor, canWrite: !isLeitor };
}

export const useCurrentUserRole = useUserRole;

