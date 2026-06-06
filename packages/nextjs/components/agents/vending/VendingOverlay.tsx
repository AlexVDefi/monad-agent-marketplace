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
const KEYPAD_RECT = { top: 30.5, left: 20, width: 60, height: 40 }; // SELECTED/PAYING: aligned to the zoomed display box
const TRAY_RECT = { top: 20, left: 15, width: 66, height: 58 }; // VENDED/ERROR: output dropped into the bottom tray

/**
 * The HTML overlay laid on the machine's black panel. Plain DOM (crisp + typable), positioned in
 * percentages of the fixed-aspect box. Switches panels by vending phase; the box itself glides
 * between the screen rect and the keypad rect to track the scripted camera move.
 */
export function VendingOverlay() {
  const phase = useVendingStore(s => s.phase);
  const cameraSettled = useVendingStore(s => s.cameraSettled);
  const onGrid = phase === "browse";
  const inTray = phase === "vended" || phase === "error";
  const rect = onGrid ? SCREEN_RECT : inTray ? TRAY_RECT : KEYPAD_RECT;
  // Only the output panel keeps the screen "chrome" (background + border + glow) so it stays easy to
  // read. The agent menu and the prompt window are chrome-less — their cards/fields sit directly on
  // the machine. The whole overlay only mounts once the camera has settled (no UI mid-tween).
  const chrome = inTray;

  // During the coin-insert phase there's no overlay — the coin animation in 3D is the whole show.
  if (phase === "inserting" || !cameraSettled) return null;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div
        className={`vending-screen-theme vending-panel-in${chrome ? " vending-screen-glow" : ""}`}
        style={{
          position: "absolute",
          top: `${rect.top}%`,
          left: `${rect.left}%`,
          width: `${rect.width}%`,
          height: `${rect.height}%`,
          pointerEvents: "auto",
          borderRadius: 14,
          border: chrome ? "1px solid var(--line-strong)" : "none",
          background: chrome ? "color-mix(in oklab, var(--bg-0) 80%, transparent)" : "transparent",
          backdropFilter: chrome ? "blur(2px)" : "none",
          overflow: "hidden",
        }}
      >
        {onGrid && <AgentGridPanel />}
        {(phase === "selected" || phase === "paying") && <KeypadPanel />}
        {inTray && <DispenserTray />}
      </div>
    </div>
  );
}
