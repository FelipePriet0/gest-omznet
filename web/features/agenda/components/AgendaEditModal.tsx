"use client";

import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect, type SelectOption } from "@/components/ui/select";
import { TimeMultiSelect } from "@/components/ui/time-multi-select";
import type { ScheduleCard, Technician } from "../types";
import { listRoutes, type Route } from "@/features/builder/services";
import { PLANO_OPTIONS, VENC_OPTIONS, SVA_OPTIONS } from "@/features/editar-ficha/constants";
import { DateSingleKanbanPopover } from "@/components/ui/date-single-kanban-popover";
import { supabase } from "@/lib/supabaseClient";

// ── Tipo de instalação ────────────────────────────────────────────────────────
const TIPO_INST_UI = ["Casa", "Prédio com Prumada", "Prédio sem Prumada", "Wi-Fi Extend"] as const;
function uiToTipoInst(v: string): string | null {
  const m: Record<string, string> = {
    Casa: "casa",
    "Prédio com Prumada": "predio_com_prumada",
    "Prédio sem Prumada": "predio_sem_prumada",
    "Wi-Fi Extend": "wifi_extend",
  };
  return m[v] ?? null;
}
function tipoInstToUI(v: string | null): string {
  const m: Record<string, string> = {
    casa: "Casa",
    predio_com_prumada: "Prédio com Prumada",
    predio_sem_prumada: "Prédio sem Prumada",
    wifi_extend: "Wi-Fi Extend",
  };
  return v ? (m[v] ?? v) : "";
}

// Helper: row label
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-zinc-600">{label}</Label>
      {children}
    </div>
  );
}

const TRIGGER_CLS = "h-9 rounded-[7px] px-3 text-sm bg-zinc-50 border border-zinc-200";

// ── Component ─────────────────────────────────────────────────────────────────
export function AgendaEditModal({
  open,
  card,
  technicians,
  slots,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  card: ScheduleCard | null;
  technicians: Technician[];
  slots: string[];
  onClose: () => void;
  onSave: (patch: Partial<ScheduleCard>) => void;
  onDelete: () => void;
}) {
  const techOptions = useMemo(() => technicians.map((t) => t.name).filter(Boolean), [technicians]);
  const techNameById = useMemo(() => {
    const m = new Map<string, string>();
    technicians.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [technicians]);

  // ── Schedule card fields ───────────────────────────────────────────────────
  const [cliente, setCliente] = useState<string>(card?.cliente || "");
  const [slotArr, setSlotArr] = useState<string[]>(card?.time_slots?.length ? card.time_slots : (card?.time_slot ? [card.time_slot] : []));
  const [techName, setTechName] = useState<string>(card ? techNameById.get(card.technician_id) || "" : "");

  // ── Applicant fields (loaded from DB) ──────────────────────────────────────
  const [bairro, setBairro] = useState<string>(card?.bairro || "");
  const [tipo, setTipo] = useState<string>(tipoInstToUI(card?.tipo_instalacao ?? null));
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cep, setCep] = useState("");
  const [plano, setPlano] = useState("");
  const [venc, setVenc] = useState("");
  const [svaAvulso, setSvaAvulso] = useState("");
  const [carneImpresso, setCarneImpresso] = useState(false);
  const [dueAt, setDueAt] = useState<string>(card?.date || "");

  // ── Routes for bairro dropdown ─────────────────────────────────────────────
  const [routes, setRoutes] = useState<Route[]>([]);
  useEffect(() => {
    listRoutes()
      .then((r) => setRoutes(r.filter((x) => x.active)))
      .catch(console.error);
  }, []);
  const routeOptions = useMemo<SelectOption[]>(
    () => routes.map((r) => ({ label: r.name, value: r.name })),
    [routes],
  );

  // ── Load extra applicant data when card changes ────────────────────────────
  useEffect(() => {
    setCliente(card?.cliente || "");
    setBairro(card?.bairro || "");
    setTipo(tipoInstToUI(card?.tipo_instalacao ?? null));
    setSlotArr(card?.time_slots?.length ? card.time_slots : (card?.time_slot ? [card.time_slot] : []));
    setTechName(card ? techNameById.get(card.technician_id) || "" : "");
    setDueAt(card?.date || "");

    // Fetch extra applicant fields
    if (card?.applicant_id) {
      supabase
        .from("applicants")
        .select("address_line, address_number, address_complement, cep, plano_acesso, venc, sva_avulso, carne_impresso")
        .eq("id", card.applicant_id)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const d = data as any;
          setLogradouro(d.address_line || "");
          setNumero(d.address_number || "");
          setComplemento(d.address_complement || "");
          setCep(d.cep || "");
          setPlano(d.plano_acesso || "");
          setVenc(d.venc ? String(d.venc) : "");
          setSvaAvulso(d.sva_avulso || "");
          setCarneImpresso(!!d.carne_impresso);
        })
        .catch(console.error);
    } else {
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setCep("");
      setPlano("");
      setVenc("");
      setSvaAvulso("");
      setCarneImpresso(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  if (!open || !card) return null;

  const handleSave = async () => {
    const tech = technicians.find((t) => t.name === techName);

    // 1. Save applicant fields (bairro, address, plano, venc, sva, carnê)
    if (card.applicant_id) {
      const vencNum = venc ? parseInt(venc, 10) : null;
      await supabase
        .from("applicants")
        .update({
          bairro: bairro || null,
          address_line: logradouro || null,
          address_number: numero || null,
          address_complement: complemento || null,
          cep: cep || null,
          plano_acesso: plano || null,
          venc: Number.isFinite(vencNum) ? vencNum : null,
          sva_avulso: svaAvulso || null,
          carne_impresso: carneImpresso,
        })
        .eq("id", card.applicant_id);
    }

    // 2. Save tipo_instalacao + hora_at + due_at to kanban_cards
    const tipoDb = uiToTipoInst(tipo);
    const horaAt = slotArr.length > 0 ? slotArr.map((s) => s + ":00") : null;
    const dueAtIso = dueAt ? new Date(dueAt + "T12:00:00").toISOString() : null;
    await supabase.from("kanban_cards").update({ tipo_instalacao: tipoDb, hora_at: horaAt, due_at: dueAtIso }).eq("id", card.id);

    // 3. Notify parent with schedule card patch
    const patch: Partial<ScheduleCard> = {
      cliente: cliente.trim(),
      bairro: bairro || undefined,
      tipo_instalacao: tipoDb ?? undefined,
      time_slot: slotArr[0] || card.time_slot,
      time_slots: slotArr,
      technician_id: tech ? tech.id : card.technician_id,
    };
    onSave(patch);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-[600px] rounded-2xl bg-white">
        <DialogHeader className="space-y-0">
          <DialogTitle className="text-[var(--verde-primario)]">Editar agendamento</DialogTitle>
          <DialogDescription className="sr-only">Preencha os campos para editar o agendamento selecionado.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-1">

          {/* Cliente */}
          <FieldRow label="Cliente">
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} className="h-9" />
          </FieldRow>

          {/* Endereço */}
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Logradouro">
              <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className="h-9" placeholder="Rua, Av, etc." />
            </FieldRow>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Número">
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} className="h-9" />
              </FieldRow>
              <FieldRow label="CEP">
                <Input value={cep} onChange={(e) => setCep(e.target.value)} className="h-9" placeholder="00000-000" maxLength={9} />
              </FieldRow>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Complemento">
              <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} className="h-9" placeholder="Apto, Bloco..." />
            </FieldRow>
            <FieldRow label="Bairro">
              <SimpleSelect
                value={bairro}
                onChange={(v) => setBairro(v)}
                options={routeOptions}
                placeholder="— selecione —"
                triggerClassName={TRIGGER_CLS}
              />
            </FieldRow>
          </div>

          {/* Tipo de instalação */}
          <FieldRow label="Tipo de instalação">
            <SimpleSelect
              value={tipo}
              onChange={(v) => setTipo(v)}
              options={[...TIPO_INST_UI]}
              placeholder="— selecione —"
              triggerClassName={TRIGGER_CLS}
            />
          </FieldRow>

          {/* Plano + Vencimento (mesma linha) */}
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <FieldRow label="Plano de acesso">
              <SimpleSelect
                value={plano}
                onChange={(v) => setPlano(v)}
                options={PLANO_OPTIONS}
                placeholder="— selecione —"
                triggerClassName={TRIGGER_CLS}
              />
            </FieldRow>
            <FieldRow label="Vencimento">
              <SimpleSelect
                value={venc}
                onChange={(v) => setVenc(v)}
                options={[...VENC_OPTIONS]}
                placeholder="Dia"
                triggerClassName={TRIGGER_CLS}
              />
            </FieldRow>
          </div>

          {/* SVA Avulso + Carnê Impresso */}
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <FieldRow label="SVA Avulso">
              <SimpleSelect
                value={svaAvulso}
                onChange={(v) => setSvaAvulso(v)}
                options={SVA_OPTIONS}
                placeholder="— selecione —"
                triggerClassName={TRIGGER_CLS}
              />
            </FieldRow>
            <FieldRow label="Carnê impresso">
              <SimpleSelect
                value={carneImpresso ? "Sim" : "Não"}
                onChange={(v) => setCarneImpresso(v === "Sim")}
                options={["Sim", "Não"]}
                triggerClassName={TRIGGER_CLS}
              />
            </FieldRow>
          </div>

          {/* Data de instalação + Horário */}
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Instalação agendada para">
              <DateSingleKanbanPopover
                value={dueAt}
                onChange={(v) => setDueAt(v || "")}
              />
            </FieldRow>
            <FieldRow label="Horário">
              <TimeMultiSelect
                times={slots}
                value={slotArr}
                onApply={(v) => setSlotArr(v)}
                allowedPairs={[["08:30", "10:30"], ["13:30", "15:30"]]}
                triggerClassName={TRIGGER_CLS}
              />
            </FieldRow>
          </div>

          {/* Técnico */}
          <FieldRow label="Técnico">
            <SimpleSelect
              value={techName}
              onChange={(v) => setTechName(v)}
              options={techOptions}
              triggerClassName={TRIGGER_CLS}
            />
          </FieldRow>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between">
          <button type="button" className="btn-small-secondary" onClick={onDelete}>
            Excluir
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-small-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-primary-mznet" onClick={() => { void handleSave(); }}>
              Salvar
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
