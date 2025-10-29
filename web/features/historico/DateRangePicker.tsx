"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function DateRangePicker({ start, end, onChange }: { start?: string; end?: string; onChange: (start?: string, end?: string) => void }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState(start ? new Date(start) : new Date());
  const [selStart, setSelStart] = useState<Date | null>(start ? new Date(start) : null);
  const [selEnd, setSelEnd] = useState<Date | null>(end ? new Date(end) : null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!anchorRef.current) return;
      if (!anchorRef.current.contains(e.target as any)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    setSelStart(start ? new Date(start) : null);
    setSelEnd(end ? new Date(end) : null);
  }, [start, end]);

  function fmtLabel() {
    const s = selStart ? toYMD(selStart) : '';
    const e = selEnd ? toYMD(selEnd) : '';
    if (!s && !e) return 'Selecione período';
    const sbr = selStart ? toBR(selStart) : '—';
    const ebr = selEnd ? toBR(selEnd) : '—';
    return `${sbr} – ${ebr}`;
  }

  function selectDay(d: Date) {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(startOfDay(d));
      setSelEnd(null);
      return;
    }
    // selStart set and selEnd null
    let a = startOfDay(selStart);
    let b = startOfDay(d);
    if (b < a) { const t = a; a = b; b = t; }
    setSelStart(a);
    setSelEnd(b);
  }

  function apply() {
    onChange(selStart ? toYMD(selStart) : undefined, selEnd ? toYMD(selEnd) : undefined);
    setOpen(false);
  }

  function clearAll() {
    setSelStart(null); setSelEnd(null);
    onChange(undefined, undefined);
  }

  const days = useMemo(() => buildMonth(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="relative" ref={anchorRef}>
      <button type="button" onClick={()=> setOpen(v=>!v)} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-left text-sm outline-none focus:border-emerald-500">
        {fmtLabel()}
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-[300px] rounded-lg border bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-zinc-800">
            <button onClick={()=> setCursor(addMonths(cursor, -1))} className="rounded border px-2 py-1">‹</button>
            <div className="capitalize">{monthLabel}</div>
            <button onClick={()=> setCursor(addMonths(cursor, 1))} className="rounded border px-2 py-1">›</button>
          </div>
          <MonthGrid
            month={cursor}
            days={days}
            selStart={selStart}
            selEnd={selEnd}
            onSelect={selectDay}
          />
          <div className="mt-3 flex items-center justify-between">
            <button onClick={clearAll} className="text-xs text-zinc-700 underline">Limpar</button>
            <div className="flex gap-2">
              <button onClick={()=> setOpen(false)} className="rounded border border-zinc-300 px-3 py-1.5 text-xs">Cancelar</button>
              <button onClick={apply} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthGrid({ month, days, selStart, selEnd, onSelect }: { month: Date; days: (Date|null)[]; selStart: Date|null; selEnd: Date|null; onSelect: (d: Date)=>void }) {
  const weekdays = ['D','S','T','Q','Q','S','S'];
  function isSelected(d: Date) {
    if (!selStart) return false;
    if (selStart && !selEnd) return isSameDay(d, selStart);
    return selStart && selEnd && d >= startOfDay(selStart) && d <= startOfDay(selEnd);
  }
  function isEdge(d: Date) {
    return (selStart && isSameDay(d, selStart)) || (selEnd && isSameDay(d, selEnd));
  }
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] text-zinc-500">
        {weekdays.map((w, i)=> <div key={`${w}-${i}`}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, idx) => (
          <div key={idx} className="aspect-square">
            {d ? (
              <button
                onClick={()=> onSelect(d)}
                className={[
                  "h-full w-full rounded text-sm",
                  isSelected(d) ? (isEdge(d) ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800") : "hover:bg-zinc-100",
                ].join(' ')}
              >
                {d.getDate()}
              </button>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function toYMD(d: Date) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }
function toBR(d: Date) { return d.toLocaleDateString('pt-BR'); }
function isSameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function addMonths(d: Date, m: number) { const x = new Date(d); x.setMonth(x.getMonth()+m); return x; }
function buildMonth(ref: Date) {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const last = new Date(ref.getFullYear(), ref.getMonth()+1, 0);
  const days: (Date|null)[] = [];
  const startIdx = first.getDay(); // 0=Sun
  for (let i=0;i<startIdx;i++) days.push(null);
  for (let d=1; d<=last.getDate(); d++) days.push(new Date(ref.getFullYear(), ref.getMonth(), d));
  return days;
}
