"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { VendingOverlay } from "./VendingOverlay";
import { VendingPoster } from "./VendingPoster";
import { useMediaQuery } from "usehooks-ts";
import { Storefront } from "~~/components/agents/Storefront";
import { paneHeaderStyle } from "~~/components/agents/paneStyles";

// three.js must never run on the server — load the Canvas chunk client-side only.
const VendingCanvas = dynamic(() => import("./VendingCanvas").then(m => m.VendingCanvas), {
  ssr: false,
  loading: () => <VendingPoster />,
});

/**
 * Center hero. On a capable desktop it renders the 3D vending machine (Canvas behind, HTML overlay
 * in front, both inside ONE fixed-aspect box so they scale together). On mobile / low-end it falls
 * back to the proven <Storefront> so those users still get the full, working pay flow — and the heavy
 * three.js + GLB chunk is never even fetched on that path.
 */
export function VendingHero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const wideEnough = useMediaQuery("(min-width: 1024px) and (pointer: fine)");
  const enoughCores = typeof navigator === "undefined" ? true : (navigator.hardwareConcurrency ?? 8) >= 4;
  const canRender3D = mounted && wideEnough && enoughCores;

  // Pre-hydration AND low-end: the fallback storefront (it brings its own section chrome).
  if (!canRender3D) return <Storefront />;

  return (
    <section
      style={{
        background: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderRadius: 18,
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
      }}
    >
      <header style={paneHeaderStyle}>
        Agent vending machine <span style={{ color: "var(--text-lo)", fontWeight: 400 }}>· pick · pay · dispense</span>
      </header>
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {/* Canvas fills the FULL panel width — a wider ortho frustum so zoomed-in framings don't crop
              the left/right. The overlay lives in a height-driven 4:5 box centered horizontally; since
              the machine is sized by canvas HEIGHT and centered, the overlay stays locked to it at any
              panel width (no rect recalibration needed). */}
          <VendingCanvas />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              aspectRatio: "4 / 5",
              pointerEvents: "none",
            }}
          >
            <VendingOverlay />
          </div>
        </div>
      </div>
    </section>
  );
}
