"use client";

import { AgentGridPanel } from "./AgentGridPanel";
import { DispenserTray } from "./DispenserTray";
import { KeypadPanel } from "./KeypadPanel";
import { useVendingStore } from "./vendingStore";

/* ════════════════════════════════════════════════════════════════════════════════════════
   CALIBRATION RECTS — where the overlay UI sits over the machine, as % of the fixed-aspect box.
   Because the box holds a fixed aspect ratio and the ortho camera frames the machine to a constant
   fraction of canvas height, these percentages stay aligned at every desktop viewport size. Tune
   once after the machine first renders (measure the black screen panel + the keypad/coin-slot area).
   The box animates between the two rects as the camera eases between framings — they reinforce.
   ════════════════════════════════════════════════════════════════════════════════════════ */
const SCREEN_RECT = { top: 15.5, left: 21.5, width: 45.5, height: 47 }; // BROWSE: agent menu on the black glass
const KEYPAD_RECT = { top: 5, left: 18, width: 50, height: 48 }; // KEYPAD/TRAY: prompt+pay / result (zoomed-in)

/**
 * The HTML overlay laid on the machine's black panel. Plain DOM (crisp + typable), positioned in
 * percentages of the fixed-aspect box. Switches panels by vending phase; the box itself glides
 * between the screen rect and the keypad rect to track the scripted camera move.
 */
export function VendingOverlay() {
  const phase = useVendingStore(s => s.phase);
  const onGrid = phase === "browse";
  const rect = onGrid ? SCREEN_RECT : KEYPAD_RECT;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div
        className="vending-screen-glow vending-scanline"
        style={{
          position: "absolute",
          top: `${rect.top}%`,
          left: `${rect.left}%`,
          width: `${rect.width}%`,
          height: `${rect.height}%`,
          pointerEvents: "auto",
          borderRadius: 10,
          border: "1px solid var(--line-strong)",
          background: "color-mix(in oklab, var(--bg-0) 74%, transparent)",
          backdropFilter: "blur(2px)",
          overflow: "hidden",
          transition:
            "top 440ms var(--ease-out), left 440ms var(--ease-out), width 440ms var(--ease-out), height 440ms var(--ease-out)",
        }}
      >
        {onGrid && <AgentGridPanel />}
        {(phase === "selected" || phase === "paying") && <KeypadPanel />}
        {(phase === "vended" || phase === "error") && <DispenserTray />}
      </div>
    </div>
  );
}
