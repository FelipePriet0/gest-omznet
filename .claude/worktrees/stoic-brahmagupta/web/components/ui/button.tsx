import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "px-3 py-1.5" : "px-4 py-2",
          {
            "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600": variant === "primary",
            "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 focus-visible:ring-zinc-400": variant === "secondary",
            "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600": variant === "destructive",
            "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:ring-zinc-400": variant === "outline",
            "bg-transparent text-zinc-700 hover:bg-zinc-100 focus-visible:ring-zinc-300": variant === "ghost",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

