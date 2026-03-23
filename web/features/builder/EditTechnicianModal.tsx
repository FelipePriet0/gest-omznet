"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangePopover, type DateRangeValue } from "@/components/ui/date-range-popover";
import { toDateOnlyISO, startOfDayUtcISO, endOfDayUtcISO } from "@/lib/datetime";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { TechnicianRow } from "@/features/technicians/services";

function ActivitySelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isPlaceholder = !value?.trim().length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-5 py-3 text-left text-sm text-zinc-900 shadow-sm outline-none transition",
            "focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20",
            isPlaceholder && "text-zinc-500",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 text-[var(--verde-primario)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-1 border-0 shadow-lg bg-white rounded-lg" align="start" sideOffset={8}>
        <div role="listbox" className="flex flex-col">
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "group flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-sm mx-1 transition-all duration-150 cursor-pointer",
                  selected
                    ? "bg-[var(--verde-primario)] !text-white"
                    : "text-gray-700 hover:bg-[var(--verde-primario)] hover:text-white",
                )}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                <span className="w-4 flex items-center justify-center">
                  <Check className={cn("h-4 w-4", selected ? "text-white opacity-100" : "opacity-0")} />
                </span>
                <span className={cn("truncate", selected ? "!text-white" : "")}>{opt}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EditTechnicianModal({
  open,
  technician,
  onOpenChange,
  onSave,
  activityOptions = ["Instalação", "Mud Endereço"],
}: {
  open: boolean;
  technician: TechnicianRow | null;
  onOpenChange: (next: boolean) => void;
  onSave: (id: string, data: { name: string; activity: string | null; start: string | null; end: string | null }) => Promise<void>;
  activityOptions?: string[];
}) {
  const [name, setName] = useState("");
  const [activity, setActivity] = useState("");
  const [deadline, setDeadline] = useState<DateRangeValue>({});
  const [saving, setSaving] = useState(false);

  // Preenche o form com os dados do técnico ao abrir
  useEffect(() => {
    if (technician && open) {
      setName(technician.name || "");
      setActivity(technician.activity || "");
      setDeadline({
        start: technician.available_start ? toDateOnlyISO(new Date(technician.available_start)) : undefined,
        end: technician.available_end ? toDateOnlyISO(new Date(technician.available_end)) : undefined,
      });
    }
  }, [technician, open]);

  const canSave = useMemo(() => name.trim().length > 1, [name]);

  const reset = () => {
    setName("");
    setActivity("");
    setDeadline({});
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !technician) return;
    setSaving(true);
    try {
      // Regra: ao definir "Mud Endereço", bloquear se houver agendamentos no período
      const isMudanca = (activity || "").toLowerCase().includes("mud");
      if (isMudanca) {
        // Determinar janela: se não houver período, usar o dia atual
        const todayISO = toDateOnlyISO(new Date());
        const startLocal = deadline.start || todayISO;
        const endLocal = deadline.end || startLocal;
        const startUTC = String(startOfDayUtcISO(startLocal));
        const endUTC = String(endOfDayUtcISO(endLocal));

        // Buscar cards agendados para este técnico na janela
        const { data: rows, error } = await supabase
          .from('kanban_cards')
          .select('id, due_at, stage, archived_at')
          .eq('technician_id', technician.id)
          .gte('due_at', startUTC)
          .lte('due_at', endUTC)
          .is('deleted_at', null);
        if (error) throw error;
        const items = (rows || []).filter((r: any) => {
          const st = String(r?.stage || '').toLowerCase();
          const archived = !!r?.archived_at;
          // Ignorar cancelados/arquivados
          if (st === 'canceladas' || archived) return false;
          return true;
        });
        const count = items.length;
        if (count > 0) {
          // Quebra por dia local (yyyy-MM-dd de due_at)
          const byDay = new Map<string, number>();
          for (const it of items) {
            const d = String(it.due_at || '').slice(0,10);
            byDay.set(d, (byDay.get(d) || 0) + 1);
          }
          const parts: string[] = [];
          for (const [d, c] of Array.from(byDay.entries()).sort()) {
            parts.push(`${d}: ${c}`);
          }
          const breakdown = parts.join('\n');
          alert(
            `AVISO\n\nEste técnico possui ${count} instalação(ões) agendada(s) no período selecionado.\n` +
            (breakdown ? `\nDetalhe por dia:\n${breakdown}\n\n` : '\n') +
            `Você não pode aplicar "Mudança de Endereço" a menos que reagende todas para outro técnico na Agenda.`
          );
          setSaving(false);
          return;
        }
      }

      const start = deadline.start ? String(deadline.start) : null;
      const end = deadline.end ? String(deadline.end) : null;
      await onSave(technician.id, {
        name: name.trim(),
        activity: activity.trim() || null,
        start,
        end,
      });
      onOpenChange(false);
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar técnico.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent
        className="max-w-[560px] rounded-2xl bg-white"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-[var(--verde-primario)]">Editar técnico</DialogTitle>
          <DialogDescription>Atualize os dados do técnico.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="edit-tech-name">Nome Completo</Label>
            <Input
              id="edit-tech-name"
              placeholder="Digite aqui…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-lg px-5 py-3 shadow-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label>Atividade</Label>
            <ActivitySelect
              value={activity}
              options={activityOptions}
              placeholder="Selecionar"
              onChange={setActivity}
            />
          </div>

          <div className="grid gap-2">
            <Label>Prazo da atividade</Label>
            <DateRangePopover
              value={deadline}
              onChange={setDeadline}
              placeholder="Selecionar"
              variant="kanban"
            />
          </div>

          <DialogFooter className="pt-2">
            <button type="submit" className="btn-primary-mznet" disabled={!canSave || saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
