"use client";

import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

export type TechnicianCreateValue = {
  name: string;
  activity: string;
  deadline: DateRangeValue;
  status: string;
};

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
  const label = value?.trim().length ? value : placeholder;
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
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="h-4 w-4 text-[var(--verde-primario)]" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-1 border-0 shadow-lg bg-white rounded-lg" align="start" sideOffset={8}>
        <div role="listbox" aria-label="Selecionar atividade" className="flex flex-col">
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "group flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-sm mx-1",
                  "transition-all duration-150 cursor-pointer",
                  selected
                    ? "bg-[var(--verde-primario)] !text-white"
                    : "text-gray-700 hover:bg-[var(--verde-primario)] hover:text-white",
                )}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
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

export function AddTechnicianModal({
  open,
  onOpenChange,
  onSave,
  activityOptions = ["Instalação", "Mud Endereço"],
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSave: (value: TechnicianCreateValue) => void;
  activityOptions?: string[];
}) {
  const [name, setName] = useState("");
  const [activity, setActivity] = useState("");
  const [deadline, setDeadline] = useState<DateRangeValue>({});

  const canSave = useMemo(() => {
    return Boolean(
      name.trim().length > 1 &&
        activity.trim().length > 0 &&
        deadline.start &&
        deadline.end
    );
  }, [activity, deadline.end, deadline.start, name]);

  const reset = () => {
    setName("");
    setActivity("");
    setDeadline({});
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-[560px] rounded-2xl bg-white">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-[var(--verde-primario)]">Adicione um técnico a equipe</DialogTitle>
          <DialogDescription>Preencha os dados do técnico de rua. Somente gestores de rota podem criar.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSave) return;
            onSave({ name: name.trim(), activity: activity.trim(), deadline, status: "Pendente" });
            onOpenChange(false);
            reset();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="tech-full-name">Nome Completo</Label>
            <Input
              id="tech-full-name"
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
            <button type="submit" className="btn-primary-mznet" disabled={!canSave}>
              Salvar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
