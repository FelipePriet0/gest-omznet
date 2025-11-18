 "use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useUserRole({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  const [role, setRole] = useState<string | null>(null);
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
        setRole(profile?.role ?? null);
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

  return { role, loading };
}

