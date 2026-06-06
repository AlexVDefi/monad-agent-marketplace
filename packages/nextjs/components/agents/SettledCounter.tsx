"use client";

import { useEffect, useRef } from "react";
import { useFeedStore } from "./feedStore";

const format = (micro: number) =>
  (micro / 1e6).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });

/**
 * The Σ SETTLED counter — the second hero element. Subscribes only to `totalMicroUsdc` (which
 * changes ~once per settle, low frequency), then lerps the DISPLAY toward the target on rAF, writing
 * textContent directly. Zero React renders during the count-up tween. This number only ever climbs.
 */
export function SettledCounter() {
  const total = useFeedStore(s => s.totalMicroUsdc);
  const ref = useRef<HTMLSpanElement>(null);
  const display = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const target = total;
    const animate = () => {
      const cur = display.current;
      const next = cur + (target - cur) * 0.18;
      const done = Math.abs(target - next) < 0.5;
      display.current = done ? target : next;
      if (ref.current) ref.current.textContent = format(display.current);
      raf.current = done ? null : requestAnimationFrame(animate);
    };
    if (raf.current == null) raf.current = requestAnimationFrame(animate);
    return () => {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
    };
  }, [total]);

  return (
    <span ref={ref} className="tnum" style={{ color: "var(--settle)", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
      0.0000
    </span>
  );
}
