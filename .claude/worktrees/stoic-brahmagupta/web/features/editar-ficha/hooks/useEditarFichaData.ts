"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_TIMEZONE, utcISOToLocalParts } from "@/lib/datetime";
import { fetchApplicantCard } from "../services";
import type { AppModel } from "../types";
import type { ProfileLite } from "@/features/comments/services";
import { listProfiles } from "@/features/comments/services";

export function useEditarFichaData(params: { open: boolean; applicantId: string; cardId: string }) {
  const { open, applicantId, cardId } = params;
  const [app, setApp] = useState<AppModel>({});
  const [personType, setPersonType] = useState<"PF" | "PJ" | null>(null);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");
  const [horaAt, setHoraAt] = useState<string>("");
  const [horaArr, setHoraArr] = useState<string[]>([]);
  const [pareceres, setPareceres] = useState<any[]>([]);
  const [createdBy, setCreatedBy] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);

  const storageKey = `mz.pareceres.${cardId}`;

  const refresh = useCallback(async () => {
    const { applicant: a, card: c } = await fetchApplicantCard(applicantId, cardId);
    const a2: any = { ...(a || {}) };
    if (a2 && typeof a2.venc !== "undefined" && a2.venc !== null) a2.venc = String(a2.venc);
    setApp(a2 || {});
    setPersonType((a as any)?.person_type ?? null);
    setCreatedAt(c?.created_at ? new Date(c.created_at).toLocaleString() : "");
    const dueParts = utcISOToLocalParts(c?.due_at ?? undefined, DEFAULT_TIMEZONE);
    setDueAt(dueParts.dateISO ?? "");
    if (Array.isArray((c as any)?.hora_at)) {
      const arr: any[] = (c as any).hora_at;
      const list = arr.map((h) => String(h).slice(0, 5));
      setHoraArr(list);
      setHoraAt(list[0] || "");
    } else {
      const v = c?.hora_at ? String(c.hora_at).slice(0, 5) : "";
      setHoraAt(v);
      setHoraArr(v ? [v] : []);
    }
    // Só atualiza pareceres quando backend enviar um array válido.
    // Evita limpar a UI por respostas nulas/transitórias do backend.
    if (Array.isArray((c as any)?.reanalysis_notes)) {
      const arr = (c as any).reanalysis_notes as any[];
      setPareceres(arr);
      try { localStorage.setItem(`mz.pareceres.${cardId}`, JSON.stringify(arr)); } catch {}
    }
    setCreatedBy((c as any)?.created_by || "");
    setAssigneeId((c as any)?.assignee_id || "");
  }, [applicantId, cardId]);

  useEffect(() => {
    if (!open) return;
    // Hidratar rapidamente com cache local (robustez em refresh)
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached) && cached.length > 0) setPareceres(cached);
      }
    } catch {}
    let active = true;
    (async () => {
      if (!active) return;
      await refresh();
      try {
        setProfiles(await listProfiles());
      } catch {}
    })();
    const chApp = supabase
      .channel(`rt-edit-app-${applicantId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "applicants", filter: `id=eq.${applicantId}` }, (payload: any) => {
        const row: any = payload.new || {};
        const a3: any = { ...app };
        [
          "primary_name",
          "cpf_cnpj",
          "phone",
          "whatsapp",
          "email",
          "address_line",
          "address_number",
          "address_complement",
          "cep",
          "bairro",
          "plano_acesso",
          "sva_avulso",
          "carne_impresso",
          "venc",
          "person_type",
        ].forEach((k) => {
          if (k in row) (a3 as any)[k] = row[k];
        });
        if (typeof a3.venc !== "undefined" && a3.venc !== null) a3.venc = String(a3.venc);
        setApp(a3);
        if (row.person_type) setPersonType(row.person_type);
      })
      .subscribe();
    const chCard = supabase
      .channel(`rt-edit-card-${cardId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "kanban_cards", filter: `id=eq.${cardId}` }, (payload: any) => {
        const row: any = payload.new || {};
        if (row.due_at) {
          const { dateISO } = utcISOToLocalParts(row.due_at, DEFAULT_TIMEZONE);
          setDueAt(dateISO ?? "");
        }
        if (row.hora_at) {
          const arr = Array.isArray(row.hora_at) ? row.hora_at : [row.hora_at];
          const list = arr.map((h: any) => String(h).slice(0, 5));
          setHoraAt(list[0] || "");
          setHoraArr(list);
        }
        if (Array.isArray(row.reanalysis_notes)) {
          setPareceres(row.reanalysis_notes);
          try { localStorage.setItem(storageKey, JSON.stringify(row.reanalysis_notes)); } catch {}
        }
        if (typeof row.created_by !== "undefined") setCreatedBy(row.created_by || "");
        if (typeof row.assignee_id !== "undefined") setAssigneeId(row.assignee_id || "");
      })
      .subscribe();
    return () => {
      active = false;
      try {
        supabase.removeChannel(chApp);
        supabase.removeChannel(chCard);
      } catch {}
    };
  }, [open, applicantId, cardId, refresh]);

  const vendorName = useMemo(() => profiles.find((p) => p.id === createdBy)?.full_name || "—", [profiles, createdBy]);
  const analystName = useMemo(() => profiles.find((p) => p.id === assigneeId)?.full_name || "—", [profiles, assigneeId]);

  return { app, personType, createdAt, dueAt, horaAt, horaArr, pareceres, createdBy, assigneeId, profiles, vendorName, analystName, refresh } as const;
}
