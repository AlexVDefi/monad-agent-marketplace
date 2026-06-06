"use client";

import { useState } from "react";

const TASK =
  "Summarize this and gauge user sentiment: 'Monad ships a parallel EVM with sub-second finality and 10k TPS.'";
const COUNT = 8;

/**
 * L3 — fires the autonomous agent-to-agent swarm. Hits /api/orchestrate, where a server-side
 * orchestrator pays N sub-agents via x402 (no human signatures). The settlements stream into the
 * live feed via the on-chain CallLogged subscription — a burst with ZERO wallet popups.
 */
export function AgentSwarm() {
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setNote(null);
    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: TASK, count: COUNT }),
      });
      const data = await res.json();
      setNote(
        res.ok ? `settled ${data.settled}/${data.planned} · no popups` : (data.error ?? "swarm failed").slice(0, 60),
      );
    } catch (e) {
      setNote(e instanceof Error ? e.message.slice(0, 60) : "error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={running}
      title="An autonomous orchestrator pays N sub-agents via x402 — no MetaMask, no human in the loop"
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: running ? "not-allowed" : "pointer",
        color: "var(--bg-0)",
        background: "linear-gradient(90deg, var(--monad) 0%, var(--settle) 140%)",
        border: "1px solid transparent",
      }}
    >
      🤖 {running ? "swarming…" : note ? `agent swarm · ${note}` : `agent swarm (${COUNT}) · autonomous`}
    </button>
  );
}
