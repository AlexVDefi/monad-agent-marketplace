"use client";

import { useState } from "react";

/**
 * Static poster shown while the heavy GLB chunk loads (dynamic-import fallback). Uses the captured
 * screenshot at /3d/vending_poster.png; if it's ever missing, falls back to a themed placeholder so
 * the demo never shows a blank canvas.
 */
export function VendingPoster({ label = "Warming up the machine…" }: { label?: string }) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "radial-gradient(120% 90% at 50% 30%, #fff9ef 0%, #f3eadb 70%)",
        overflow: "hidden",
      }}
    >
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/3d/vending_poster.png"
          alt="Agent vending machine"
          onError={() => setImgOk(false)}
          style={{ maxWidth: "92%", maxHeight: "82%", objectFit: "contain", opacity: 0.95 }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            width: "min(58%, 280px)",
            aspectRatio: "4 / 5",
            borderRadius: 22,
            border: "1px solid var(--line-strong)",
            background: "linear-gradient(160deg, #ffffff 0%, #f3eadb 100%)",
            boxShadow: "inset 0 0 60px rgba(108,92,231,0.1), var(--shadow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 64,
          }}
        >
          🍬
        </div>
      )}
      <div className="anim-dot ui-font" style={{ fontSize: 12, letterSpacing: "0.01em", color: "var(--text-lo)" }}>
        {label}
      </div>
    </div>
  );
}
