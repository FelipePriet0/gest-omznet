"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ListFilter } from "lucide-react";
import { useState } from "react";

interface TaskFilterCTAProps {
  q: string;
  setQ: (value: string) => void;
  status: 'all' | 'pending' | 'completed';
  setStatus: (value: 'all' | 'pending' | 'completed') => void;
  due: 'all' | 'hoje' | 'amanha' | 'atrasado' | 'intervalo';
  setDue: (value: 'all' | 'hoje' | 'amanha' | 'atrasado' | 'intervalo') => void;
  ds: string;
  setDs: (value: string) => void;
  de: string;
  setDe: (value: string) => void;
  onApply: () => void;
  loading: boolean;
}

export function TaskFilterCTA({
  q, setQ, status, setStatus, due, setDue, ds, setDs, de, setDe, onApply, loading
}: TaskFilterCTAProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="transition-all duration-200 group h-6 text-xs items-center rounded-sm flex gap-1.5 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ListFilter className="size-3 shrink-0 transition-all text-muted-foreground group-hover:text-neutral-700" />
          Filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4 bg-white border-0 shadow-lg rounded-lg">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Busca</label>
            <input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Descrição ou nome do cliente" 
              className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as any)} 
                className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="completed">Concluídas</option>
              </select>
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Prazo</label>
              <select 
                value={due} 
                onChange={(e) => setDue(e.target.value as any)} 
                className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todos</option>
                <option value="hoje">Hoje</option>
                <option value="amanha">Amanhã</option>
                <option value="atrasado">Atrasadas</option>
                <option value="intervalo">Intervalo</option>
              </select>
            </div>
          </div>
          
          {due === 'intervalo' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">De</label>
                <input 
                  type="date" 
                  value={ds} 
                  onChange={(e) => setDs(e.target.value)} 
                  className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Até</label>
                <input 
                  type="date" 
                  value={de} 
                  onChange={(e) => setDe(e.target.value)} 
                  className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-2">
            <Button
              disabled={loading}
              onClick={() => {
                onApply();
                setOpen(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
