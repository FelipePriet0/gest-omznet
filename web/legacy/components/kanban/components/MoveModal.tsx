"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/legacy/components/kanban/components/Modal";
import { changeStage } from "@/features/kanban/services";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";

const COMERCIAL = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'feitas', label: 'Feitas / Cadastrar no MK' },
  { value: 'aguardando', label: 'Aguardando documentos' },
  { value: 'canceladas', label: 'Canceladas' },
  { value: 'concluidas', label: 'Concluídas' },
];
const ANALISE = [
  { value: 'recebidos', label: 'Recebidos' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'reanalise', label: 'Reanálise' },
  { value: 'aprovados', label: 'Aprovados' },
  { value: 'negados', label: 'Negados' },
  { value: 'ass_app', label: 'Ass App' },
  { value: 'finalizados', label: 'Finalizados' },
  { value: 'canceladas', label: 'Canceladas' },
];

export function MoveModal({ open, onClose, cardId, presetArea, onMoved }: { open: boolean; onClose: () => void; cardId: string; presetArea?: 'comercial' | 'analise'; onMoved?: () => void }) {
  const [area, setArea] = useState<'comercial' | 'analise'>(presetArea ?? 'comercial');
  const [stage, setStage] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const stages = useMemo(() => (area === 'analise' ? ANALISE : COMERCIAL), [area]);
  const needsReason = stage === 'canceladas';
  const [openArea, setOpenArea] = useState(false);
  const [openStage, setOpenStage] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const [stageQuery, setStageQuery] = useState("");

  async function onConfirm() {
    if (!stage) return;
    if (stage === 'entrada') {
      alert('A coluna Entrada não aceita movimentação para dentro.');
      return;
    }
    if (needsReason && reason.trim() === '') {
      alert('Informe o motivo para cancelar.');
      return;
    }
    setLoading(true);
    try {
      await changeStage(cardId, area, stage, needsReason ? reason : undefined);
      onMoved?.();
      onClose();
    } catch (e: any) {
      alert(e.message ?? 'Falha ao mover');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mover Card">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-600">Kanban</label>
          <Popover open={openArea} onOpenChange={(o) => { setOpenArea(o); if (!o) setAreaQuery(""); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 w-full justify-between text-sm px-3 rounded-[8px]">
                {area === 'analise' ? 'Análise' : 'Comercial'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-white border-0 shadow-lg rounded-[8px] popover-content">
              <Command className="rounded-[8px]">
                <CommandInput placeholder="Buscar..." className="h-9 !border-0 !border-b-0 command-input" value={areaQuery} onInputCapture={(e) => setAreaQuery((e as any).currentTarget.value)} />
                <CommandList className="p-1">
                  <CommandEmpty>Nenhum resultado.</CommandEmpty>
                  <CommandGroup className="p-0">
                    {[
                      { value: 'comercial', label: 'Comercial' },
                      { value: 'analise', label: 'Análise' },
                    ].map((opt) => (
                      <CommandItem
                        key={opt.value}
                        className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1 command-item"
                        value={opt.label}
                        onSelect={() => { setArea(opt.value as any); setOpenArea(false); }}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-600">Coluna</label>
          <Popover open={openStage} onOpenChange={(o) => { setOpenStage(o); if (!o) setStageQuery(""); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 w-full justify-between text-sm px-3 rounded-[8px]">
                {stage ? (stages.find((s) => s.value === stage)?.label ?? 'Escolha…') : 'Escolha…'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-white border-0 shadow-lg rounded-[8px] popover-content">
              <Command className="rounded-[8px]">
                <CommandInput placeholder="Buscar..." className="h-9 !border-0 !border-b-0 command-input" value={stageQuery} onInputCapture={(e) => setStageQuery((e as any).currentTarget.value)} />
                <CommandList className="p-1">
                  <CommandEmpty>Nenhum resultado.</CommandEmpty>
                  <CommandGroup className="p-0">
                    {stages.map((s) => (
                      <CommandItem
                        key={s.value}
                        className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1 command-item"
                        value={s.label}
                        onSelect={() => { setStage(s.value); setOpenStage(false); }}
                      >
                        <span className="text-sm font-medium">{s.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {needsReason && (
          <div>
            <label className="mb-1 block text-sm text-zinc-600">Motivo</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition" rows={3} />
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onConfirm} disabled={loading} className="h-9 rounded-[8px] bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70">Confirmar</button>
        </div>
      </div>
    </Modal>
  );
}
