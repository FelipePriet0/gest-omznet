"use client";

export function CanvasPage() {
  return (
    <div
      className="flex-1 w-full h-full bg-black/40"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "20px 20px, 20px 20px",
        backgroundPosition: "-1px -1px",
      }}
    />
  );
}
