"use client";

export function CanvasPage() {
  return (
    <div
      className="-m-3 md:-m-6 h-[calc(100vh-120px)] rounded-3xl border border-white/10 bg-black/40 shadow-sm"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "20px 20px, 20px 20px",
        backgroundPosition: "-1px -1px",
      }}
    />
  );
}
