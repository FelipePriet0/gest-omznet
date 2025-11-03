"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          // Base visual inspirado no ui-features/Textarea + sombra padrão
          "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-[rgba(1,137,66,0.6)]",
          "shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)]",
          "outline-none focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 focus-visible:border-emerald-600",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

