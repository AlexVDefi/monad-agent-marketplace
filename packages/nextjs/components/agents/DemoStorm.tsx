"use client";

import { useState } from "react";
import { useFireCall } from "./useFireCall";
import { getAgent } from "~~/services/agents/registry";

const STORM_N = 3;

/**
 * Fires STORM_N REAL paid calls of the instant (deterministic) agent at once → the buyer signs each
 * (MetaMask queues them) and the rows cascade in and settle near-simultaneously. Honest: every row
 * is a genuine x402 settlement. (The no-signature flood is the L3 server-side agent-to-agent mode.)
 */
export function DemoStorm() {
  const { fire, ready } = useFireCall();
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (running || !ready) return;
    setRunning(true);
    const stamp = getAgent("stamp");
    if (!stamp) {
      setRunning(false);
      return;
    }
    try {
      await Promise.allSettled(
        Array.from({ length: STORM_N }, (_, i) => fire(stamp, `storm #${i + 1} · ${Date.now()}`)),
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={!ready || running}
      className="anim-storm-host"
      style={{
        width: "100%",
        padding: "11px 14px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.01em",
        cursor: !ready || running ? "not-allowed" : "pointer",
        color: "var(--monad-deep)",
        background: "color-mix(in oklab, var(--monad) 12%, transparent)",
        border: "1px solid color-mix(in oklab, var(--monad) 30%, transparent)",
      }}
      title="Fire a burst of real paid calls to flood the stream"
    >
      ⚡ {running ? "Storming…" : `Demo storm (${STORM_N})`}
    </button>
  );
}
