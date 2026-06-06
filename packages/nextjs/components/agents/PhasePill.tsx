import { memo } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PencilIcon,
  XCircleIcon,
} from "@heroicons/react/16/solid";
import type { Phase } from "~~/hooks/useAgentCall";

/**
 * Fixed-width phase pill — the signature interaction. Friendly icon + Sentence-case word (never color
 * alone, for a11y + bad projectors). Color tweens on phase change; content slides in (keyed by phase).
 * The blue → amber → violet → green progression reads as "temperature rising to money."
 */
const PHASE: Record<Exclude<Phase, "idle">, { label: string; color: string; Icon: typeof ClockIcon }> = {
  request: { label: "Request", color: "var(--request)", Icon: ClockIcon },
  "402": { label: "402", color: "var(--pending)", Icon: CurrencyDollarIcon },
  signed: { label: "Signed", color: "var(--monad)", Icon: PencilIcon },
  settling: { label: "Settling", color: "var(--monad-bright)", Icon: ArrowPathIcon },
  settled: { label: "Settled", color: "var(--settle)", Icon: CheckCircleIcon },
  error: { label: "Failed", color: "var(--danger)", Icon: XCircleIcon },
};

export const PhasePill = memo(function PhasePill({ phase }: { phase: Phase }) {
  const p = PHASE[phase === "idle" ? "request" : phase];
  const Icon = p.Icon;
  const isSettled = phase === "settled";
  const isSettling = phase === "settling";
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
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.01em",
        color: p.color,
        background: `color-mix(in oklab, ${p.color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${p.color} 38%, transparent)`,
        transition:
          "background-color 200ms var(--ease-io), border-color 200ms var(--ease-io), color 200ms var(--ease-io)",
      }}
    >
      <span
        key={phase}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, animation: "row-enter 170ms var(--ease-io)" }}
      >
        <Icon
          aria-hidden
          className={isSettled ? "anim-check-pop" : isSettling ? "anim-spin" : undefined}
          style={{ width: 12, height: 12, display: "inline-block" }}
        />
        <span>{p.label}</span>
      </span>
    </span>
  );
});
