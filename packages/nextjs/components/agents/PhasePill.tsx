import { memo } from "react";
import type { Phase } from "~~/hooks/useAgentCall";

/**
 * Fixed-width phase pill — the signature interaction. Icon + UPPERCASE word (never color alone, for
 * a11y + bad projectors). Color tweens on phase change; content slides in (keyed by phase). The
 * blue → amber → violet → green progression reads as "temperature rising to money."
 */
const PHASE: Record<Exclude<Phase, "idle">, { label: string; color: string; icon: string }> = {
  request: { label: "REQUEST", color: "var(--request)", icon: "◷" },
  "402": { label: "402", color: "var(--pending)", icon: "●" },
  signed: { label: "SIGNED", color: "var(--monad)", icon: "✎" },
  settling: { label: "SETTLING", color: "var(--monad-bright)", icon: "⟳" },
  settled: { label: "SETTLED", color: "var(--settle)", icon: "✓" },
  error: { label: "FAILED", color: "var(--danger)", icon: "✕" },
};

export const PhasePill = memo(function PhasePill({ phase }: { phase: Phase }) {
  const p = PHASE[phase === "idle" ? "request" : phase];
  return (
    <span
      className="tnum"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: 96,
        height: 24,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: p.color,
        background: `color-mix(in oklab, ${p.color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${p.color} 42%, transparent)`,
        transition:
          "background-color 200ms var(--ease-io), border-color 200ms var(--ease-io), color 200ms var(--ease-io)",
      }}
    >
      <span
        key={phase}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, animation: "row-enter 170ms var(--ease-io)" }}
      >
        <span aria-hidden style={{ fontSize: 10, lineHeight: 1 }}>
          {phase === "settled" ? (
            <span className="anim-check-pop" style={{ display: "inline-block" }}>
              {p.icon}
            </span>
          ) : (
            p.icon
          )}
        </span>
        <span>{p.label}</span>
      </span>
    </span>
  );
});
