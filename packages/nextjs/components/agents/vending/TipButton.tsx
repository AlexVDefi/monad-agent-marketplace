"use client";

import { useTipDialog } from "./tipDialogStore";
import { HeartIcon } from "@heroicons/react/16/solid";
import type { AgentMeta } from "~~/services/agents/registry";

/**
 * The one tip trigger, used on every surface. It just raises the shared TipDialog for `agent`.
 *  - variant "block":   full-width pink button for the dispenser tray (the post-vend delight moment).
 *  - variant "chip":    compact ♥ button for tight rows (e.g. beside the leaderboard's 👍 rate).
 */
export function TipButton({
  agent,
  variant = "block",
  title,
}: {
  agent: AgentMeta;
  variant?: "block" | "chip";
  title?: string;
}) {
  const open = useTipDialog(s => s.open);
  const label = title ?? `Tip ${agent.name} in USDC`;

  if (variant === "chip") {
    return (
      <button
        onClick={() => open(agent)}
        title={label}
        aria-label={label}
        className="tip-chip"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "5px 10px",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          color: "var(--tip)",
          background: "color-mix(in oklab, var(--tip) 12%, transparent)",
          border: "1px solid color-mix(in oklab, var(--tip) 40%, var(--line-strong))",
        }}
      >
        <HeartIcon aria-hidden style={{ width: 12, height: 12 }} />
        <span style={{ fontSize: 11 }}>Tip</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => open(agent)}
      title={label}
      className="tip-chip"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.01em",
        color: "var(--tip)",
        background: "color-mix(in oklab, var(--tip) 10%, transparent)",
        border: "1px solid color-mix(in oklab, var(--tip) 36%, transparent)",
        cursor: "pointer",
        font: "inherit",
      }}
    >
      <HeartIcon aria-hidden style={{ width: 14, height: 14 }} /> Tip this agent
    </button>
  );
}
