"use client";

import * as React from "react";

export function Section({ title, children, variant, className, titleClassName, cardClassName }: { title: string; children: React.ReactNode; variant?: string; className?: string; titleClassName?: string; cardClassName?: string }) {
  const wrapperClasses = [variant, className].filter(Boolean).join(" ");
  const cardClasses = ["section-card rounded-lg bg-white p-4 sm:p-6", cardClassName].filter(Boolean).join(" ");
  const headingClasses = ["section-title text-sm font-semibold", titleClassName, variant].filter(Boolean).join(" ");
  return (
    <section className={wrapperClasses || undefined}>
      <div className={cardClasses}>
        <div className="section-header mb-4 sm:mb-6">
          <h3 className={headingClasses}>{title}</h3>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export function Grid({ cols, children }: { cols: 1 | 2 | 3; children: React.ReactNode }) {
  const cls = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return <div className={`grid gap-4 sm:gap-6 ${cls}`}>{children}</div>;
}

