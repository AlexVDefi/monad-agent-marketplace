"use client";

import { useVendingFire } from "./useVendingFire";
import { useVendingStore } from "./vendingStore";
import { ChevronLeftIcon } from "@heroicons/react/16/solid";
import { getAgent } from "~~/services/agents/registry";

/**
 * The keypad / coin-slot panel: type a prompt on the real keyboard, then hit the big PAY key. PAY
 * runs the genuine x402 payment via useVendingFire (→ useFireCall). The live phase detail still
 * streams in the left PaymentStream; here we just show a coarse busy state to keep it uncluttered.
 */
export function KeypadPanel() {
  const selectedAgentId = useVendingStore(s => s.selectedAgentId);
  const prompt = useVendingStore(s => s.prompt);
  const setPrompt = useVendingStore(s => s.setPrompt);
  const back = useVendingStore(s => s.back);
  const { payAndVend, ready, busy } = useVendingFire();

  const agent = selectedAgentId ? getAgent(selectedAgentId) : undefined;
  if (!agent) return null;

  const payLabel = !ready ? "Connect wallet" : busy ? "Authorizing…" : `Insert ${agent.priceUsd} · pay`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
      }}
    >
      {/* selected agent header + back */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={back}
          disabled={busy}
          title="Back to agent menu"
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid var(--line)",
            background: "var(--bg-2)",
            color: "var(--text-mid)",
            borderRadius: 10,
            padding: "5px 8px",
            fontSize: 12,
            cursor: busy ? "not-allowed" : "pointer",
            font: "inherit",
          }}
        >
          <ChevronLeftIcon aria-hidden style={{ width: 14, height: 14 }} />
        </button>
        <span aria-hidden style={{ fontSize: 20 }}>
          {agent.glyph}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0 }}>{agent.name}</span>
        <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--monad-bright)" }}>
          {agent.priceUsd}
        </span>
      </div>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder={agent.placeholder}
        spellCheck={false}
        disabled={busy}
        className="ui-font vending-prompt"
        onKeyDown={e => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) payAndVend();
        }}
        style={{
          flex: 1,
          minHeight: 0,
          resize: "none",
          width: "100%",
          background: "var(--bg-0)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--text-hi)",
          outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setPrompt("")}
          disabled={busy || !prompt}
          title="Clear"
          style={{
            border: "1px solid var(--line)",
            background: "var(--bg-2)",
            color: "var(--text-mid)",
            borderRadius: 12,
            padding: "0 16px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.01em",
            cursor: busy || !prompt ? "not-allowed" : "pointer",
            font: "inherit",
          }}
        >
          Clear
        </button>
        <button
          onClick={payAndVend}
          disabled={!ready || busy}
          className="vending-pay"
          title={ready ? `Pay ${agent.priceUsd} and run ${agent.name}` : "Connect a wallet on Monad testnet first"}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.01em",
            cursor: !ready || busy ? "not-allowed" : "pointer",
            border: "1px solid transparent",
            color: !ready ? "var(--text-lo)" : "#fff",
            background: !ready ? "var(--bg-3)" : busy ? "var(--monad-deep)" : "var(--monad)",
            transition: "background 120ms var(--ease-out), transform 80ms var(--ease-snap)",
          }}
        >
          {payLabel}
        </button>
      </div>
    </div>
  );
}
