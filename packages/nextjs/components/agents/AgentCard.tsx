"use client";

import { useState } from "react";
import { useFireCall } from "./useFireCall";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import type { AgentMeta } from "~~/services/agents/registry";

const SAMPLE: Record<string, string> = {
  stamp: "Agent Bazaar — Monad Blitz Lisbon, 6 Jun 2026.",
  tldr: "Monad is a high-performance, EVM-compatible layer-1 with parallel execution, an asynchronous pipeline, and sub-second finality, targeting 10,000 TPS while staying fully bytecode-compatible with Ethereum.",
  sentiment:
    "This live payment stream is mesmerizing — micropayments settling in under a second is exactly the future I want to build.",
};

export function AgentCard({ agent }: { agent: AgentMeta }) {
  const { fire, ready } = useFireCall();
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");

  const { data: callCount } = useScaffoldReadContract({
    contractName: "AgentBazaar",
    functionName: "callCount",
    args: [BigInt(agent.agentId)],
    watch: false,
  });

  const onCall = async () => {
    if (busy || !ready) return;
    setBusy(true);
    try {
      await fire(agent, input.trim() || SAMPLE[agent.id] || "hello");
    } catch {
      /* surfaced as an error row in the stream */
    } finally {
      setBusy(false);
    }
  };

  const isLlm = agent.kind === "llm";

  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--line-strong)";
        e.currentTarget.style.boxShadow = "0 6px 20px -8px rgba(0,0,0,0.6)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--line)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden style={{ fontSize: 18 }}>
          {agent.glyph}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{agent.name}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            padding: "2px 6px",
            borderRadius: 4,
            textTransform: "uppercase",
            color: isLlm ? "var(--monad-bright)" : "var(--settle)",
            background: `color-mix(in oklab, ${isLlm ? "var(--monad)" : "var(--settle)"} 14%, transparent)`,
          }}
        >
          {isLlm ? "LLM" : "instant"}
        </span>
      </div>

      <p className="ui-font" style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: "var(--text-mid)" }}>
        {agent.blurb}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="tnum" style={{ fontSize: 13, fontWeight: 700 }}>
          {agent.priceUsd}
          <span style={{ color: "var(--text-lo)", fontWeight: 400 }}> /call</span>
        </span>
        <span className="tnum" style={{ fontSize: 11, color: "var(--text-lo)" }}>
          {callCount != null ? `${callCount.toString()} calls` : "—"}
        </span>
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={agent.placeholder}
        spellCheck={false}
        className="ui-font"
        style={{
          width: "100%",
          background: "var(--bg-0)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: "6px 8px",
          fontSize: 12,
          color: "var(--text-hi)",
          outline: "none",
        }}
        onKeyDown={e => {
          if (e.key === "Enter") onCall();
        }}
      />

      <button
        onClick={onCall}
        disabled={!ready || busy}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          cursor: !ready || busy ? "not-allowed" : "pointer",
          border: "1px solid transparent",
          color: !ready ? "var(--text-lo)" : "var(--bg-0)",
          background: !ready ? "var(--bg-3)" : busy ? "var(--monad-deep)" : "var(--monad)",
          transition: "background 120ms var(--ease-out)",
        }}
        title={ready ? `Pay ${agent.priceUsd} and call ${agent.name}` : "Connect a wallet on Monad testnet first"}
      >
        {!ready ? "connect wallet" : busy ? "calling…" : "call ▸"}
      </button>
    </div>
  );
}
