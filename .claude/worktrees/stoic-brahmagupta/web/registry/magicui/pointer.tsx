"use client";

import React, { useCallback, useRef, useState } from "react";

type PointerProps = {
  className?: string;
  children?: React.ReactNode;
};

// Lightweight pointer follower: positions children at cursor inside the nearest relative container.
export function Pointer({ className, children }: PointerProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const onMouseMove = useCallback((ev: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
  }, []);

  return (
    <div ref={wrapRef} onMouseMove={onMouseMove} className={className} style={{ position: "relative" }}>
      {children ? (
        <div
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          {children}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          <span className="text-2xl">👆</span>
        </div>
      )}
    </div>
  );
}

export default Pointer;

