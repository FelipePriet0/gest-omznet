"use client";

import * as React from "react";
import { SimpleSelect } from "@/components/ui/select";
import type { Opt } from "../types";

const labelCls = "block mb-1.5 text-[14px] font-bold uppercase tracking-wide leading-none text-zinc-600";
const inputCls =
  "h-10 w-full rounded-[2px] border border-zinc-400 bg-blue-100 px-3 text-sm outline-none text-zinc-900 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600 transition-colors";
const inputDisabledCls = "text-zinc-400 cursor-not-allowed opacity-70";

export function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  maxLength,
  inputMode,
  status = "idle",
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  status?: "idle" | "pending" | "error";
  onBlur?: () => void;
}) {
  const id = `fld-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="w-full">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`${inputCls} ${disabled ? inputDisabledCls : ""}`}
      />
      <FieldStatusIndicator status={status} />
    </div>
  );
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  triggerClassName?: string;
  contentClassName?: string;
  triggerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
};

export function Select({ label, value, onChange, options, triggerClassName, contentClassName, triggerStyle, contentStyle }: SelectProps) {
  const id = `sel-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="w-full">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <SimpleSelect
        value={value}
        onChange={(v) => onChange(v)}
        options={options}
        placeholder=""
        triggerClassName={`h-10 rounded-[2px] px-3 text-sm bg-blue-100 border border-zinc-400 shadow-none focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600 ${triggerClassName ?? ""}`}
        contentClassName={`shadow-none ${contentClassName ?? ""}`}
        triggerStyle={triggerStyle}
        contentStyle={contentStyle}
      />
    </div>
  );
}

export function SelectAdv(props: SelectProps) {
  return <Select {...props} />;
}

function FieldStatusIndicator({ status }: { status: "idle" | "pending" | "error" }) {
  if (status === "idle") return null;
  return (
    <div className="text-xs text-gray-500 h-4 flex items-center gap-1 mt-0.5">
      {status === "pending" && <span>Salvando…</span>}
      {status === "error" && <span className="text-red-500">Erro ao salvar</span>}
    </div>
  );
}
