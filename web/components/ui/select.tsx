"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export type SelectOption = string | { label: string; value: string; disabled?: boolean };

function getLabel(opt: SelectOption): { label: string; value?: string; disabled?: boolean } {
  if (typeof opt === "string") return { label: opt, value: opt, disabled: false };
  return opt;
}

export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  triggerClassName,
  contentClassName,
  triggerStyle,
  contentStyle,
  groups,
  enableCtrlMergeHover,
  onCtrlMergedSelect,
  overrideLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  triggerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  groups?: string[][];
  enableCtrlMergeHover?: boolean;
  onCtrlMergedSelect?: (values: string[]) => void;
  overrideLabel?: string;
}) {
  const current = options.find((o) => getLabel(o).value === value) as SelectOption | undefined;
  const currentLabel = overrideLabel ?? (current ? getLabel(current).label : (value || placeholder || ""));

  const [ctrl, setCtrl] = React.useState(false);
  const [mergedHover, setMergedHover] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    if (!enableCtrlMergeHover) return;
    const onDown = (e: KeyboardEvent) => { if (e.key === 'Control') setCtrl(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === 'Control') { setCtrl(false); setMergedHover(null); } };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [enableCtrlMergeHover]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-900 shadow-sm outline-none",
            "focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20",
            className,
            triggerClassName,
          )}
          style={triggerStyle}
        >
          <span className="truncate text-left">{currentLabel}</span>
          <span
            aria-hidden
            className="ml-2 inline-block align-middle"
            style={{ color: 'var(--verde-primario)', transform: 'rotate(90deg)' }}
          >
            &gt;
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-white text-zinc-900 shadow-md mz-select-content",
            contentClassName,
          )}
          style={contentStyle}
        >
          <div className="max-h-[260px] overflow-auto p-1" onMouseLeave={() => setMergedHover(null)}>
            {options.map((o, idx) => {
              const { label, value: val, disabled } = getLabel(o);
              if (!val || disabled) {
                return (
                  <div key={idx} className="px-2 py-1.5 text-xs font-semibold text-zinc-500 select-none">
                    {label}
                  </div>
                );
              }
              const isActive = val === value;
              return (
                <DropdownMenu.Item
                  key={val + idx}
                  onMouseEnter={() => {
                    if (enableCtrlMergeHover && ctrl && Array.isArray(groups) && groups.length > 0) {
                      const g = groups.find(gp => gp.includes(val));
                      setMergedHover(g || null);
                    }
                  }}
                  onSelect={() => {
                    if (enableCtrlMergeHover && ctrl && mergedHover && mergedHover.includes(val)) {
                      onCtrlMergedSelect?.(mergedHover);
                    }
                    onChange(val);
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    "hover:bg-[var(--verde-primario)] hover:text-white",
                    isActive ? "bg-emerald-50 text-emerald-700" : mergedHover?.includes(val) ? "bg-[var(--verde-primario)] text-white" : "text-zinc-800",
                  )}
                >
                  <span className="truncate">{label}</span>
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
