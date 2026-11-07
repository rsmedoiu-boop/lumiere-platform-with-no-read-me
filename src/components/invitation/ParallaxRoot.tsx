"use client";

/**
 * Depth for Cinematic motion. On a mouse or trackpad the invitation leans
 * gently towards the pointer; layers with more depth move further. Touch
 * screens get a slow automatic drift instead (pure CSS), so nothing depends
 * on motion sensors or permissions.
 */
import { useRef, type ReactNode } from "react";

export function ParallaxRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    });
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty("--px", "0");
    ref.current?.style.setProperty("--py", "0");
  };

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className="inv-parallax">
      {children}
    </div>
  );
}
