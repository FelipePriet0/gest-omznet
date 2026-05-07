"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hora
const WARN_BEFORE_MS = 2 * 60 * 1000; // aviso 2 min antes

const ACTIVITY_EVENTS = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"] as const;

export function useInactivityLogout(onWarn: (secondsLeft: number) => void, onDismissWarn: () => void) {
  const router = useRouter();
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  }, []);

  const doLogout = useCallback(async () => {
    clearTimers();
    await supabase.auth.signOut({ scope: "global" });
    router.replace("/login");
  }, [clearTimers, router]);

  const resetTimers = useCallback(() => {
    clearTimers();
    onDismissWarn();

    warnTimer.current = setTimeout(() => {
      let secondsLeft = Math.round(WARN_BEFORE_MS / 1000);
      onWarn(secondsLeft);
      countdownTimer.current = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          if (countdownTimer.current) clearInterval(countdownTimer.current);
        } else {
          onWarn(secondsLeft);
        }
      }, 1000);
    }, INACTIVITY_MS - WARN_BEFORE_MS);

    logoutTimer.current = setTimeout(doLogout, INACTIVITY_MS);
  }, [clearTimers, doLogout, onWarn, onDismissWarn]);

  useEffect(() => {
    resetTimers();
    const handleActivity = () => resetTimers();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [resetTimers, clearTimers]);
}
