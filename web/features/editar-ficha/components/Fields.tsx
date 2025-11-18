"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import type { Opt } from "../types";

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
    <div className="w-full space-y-2">
      <Label htmlFor={id} className="field-label text-h1">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`mt-1 h-12 rounded-lg px-5 py-3 ${disabled ? "field-input-disabled" : ""}`}
      />
      <FieldStatusIndicator status={status} />
    </div>
  );
}

export function Select({ label, value, onChange, options, triggerClassName, contentClassName, triggerStyle, contentStyle }: { label: string; value: string; onChange: (v: string) => void; options: Opt[]; triggerClassName?: string; contentClassName?: string; triggerStyle?: React.CSSProperties; contentStyle?: React.CSSProperties }) {
  const id = `sel-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id} className="field-label text-h1">
        {label}
      </Label>
      <SimpleSelect value={value} onChange={(v) => onChange(v)} options={options} placeholder="" className="mt-1" triggerClassName={triggerClassName} contentClassName={contentClassName} triggerStyle={triggerStyle} contentStyle={contentStyle} />
    </div>
  );
}

export function SelectAdv({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Opt[] }) {
  return <Select label={label} value={value} onChange={onChange} options={options} />;
}

function FieldStatusIndicator({ status }: { status: "idle" | "pending" | "error" }) {
  if (status === "idle") return null;
  return (
    <div className="text-xs text-gray-500 h-4 flex items-center gap-1">
      {status === "pending" && <span>Salvando…</span>}
      {status === "error" && <span className="text-red-500">Erro ao salvar</span>}
    </div>
  );
}

