"use client";

export function Legend() {
  const chip = (color: string, label: string) => (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-[var(--verde-primario)] font-bold">{label}</span>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chip("#10b981", "Aprovado")}
      {chip("#f59e0b", "Reanálise")}
      {chip("#facc15", "Mudança de Endereço")}
    </div>
  );
}
