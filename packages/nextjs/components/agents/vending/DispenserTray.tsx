"use client";

import { useVendingStore } from "./vendingStore";
import { getAgent } from "~~/services/agents/registry";

/**
 * The dispenser tray: on success the result "vends" — an item card drops in (CSS @keyframes
 * tray-drop) showing the agent's output. On failure it shows the error with a retry. The settlement
 * itself is already reflected in the live PaymentStream + Σ counter (this is just the fun reveal).
 */
export function DispenserTray() {
  const phase = useVendingStore(s => s.phase);
  const result = useVendingStore(s => s.result);
  const error = useVendingStore(s => s.error);
  const selectedAgentId = useVendingStore(s => s.selectedAgentId);
  const reset = useVendingStore(s => s.reset);
  const retry = useVendingStore(s => s.retry);

  const agent = selectedAgentId ? getAgent(selectedAgentId) : undefined;
  const isError = phase === "error";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: isError ? "var(--danger)" : "var(--settle)",
        }}
      >
        {isError ? "✕ jammed — not charged" : "✓ dispensed · settled on Monad"}
      </div>

      <div
        key={phase} // re-trigger the drop animation on each vend
        className="vending-drop"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 14px",
          borderRadius: 10,
          border: `1px solid ${isError ? "var(--danger)" : "var(--settle)"}`,
          background: "color-mix(in oklab, var(--bg-2) 86%, transparent)",
          boxShadow: isError ? "none" : "0 0 22px var(--settle-glow)",
          overflow: "hidden",
        }}
      >
        {agent && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ fontSize: 20 }}>
              {agent.glyph}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 0 }}>{agent.name}</span>
            {!isError && result?.settledMicroUsdc != null && (
              <span className="tnum" style={{ fontSize: 12, color: "var(--settle)" }}>
                paid {agent.priceUsd}
              </span>
            )}
          </div>
        )}

        <div
          className="ui-font"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            fontSize: 13,
            lineHeight: 1.5,
            color: isError ? "var(--danger)" : "var(--text-hi)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {isError ? error : result?.output}
        </div>

        {!isError && result?.taskHash && (
          <div className="tnum" style={{ fontSize: 10, color: "var(--text-lo)" }}>
            task {result.taskHash.slice(0, 10)}…{result.taskHash.slice(-6)}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {isError ? (
          <button onClick={retry} className="vending-pay" style={trayBtn(true)}>
            try again
          </button>
        ) : (
          <button onClick={reset} className="vending-pay" style={trayBtn(true)}>
            vend another ▸
          </button>
        )}
        <button onClick={reset} style={trayBtn(false)}>
          menu
        </button>
      </div>
    </div>
  );
}

function trayBtn(primary: boolean): React.CSSProperties {
  return {
    flex: primary ? 1 : "0 0 auto",
    padding: primary ? "11px 14px" : "11px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    cursor: "pointer",
    border: "1px solid transparent",
    color: primary ? "var(--bg-0)" : "var(--text-mid)",
    background: primary ? "var(--monad)" : "var(--bg-2)",
    borderColor: primary ? "transparent" : "var(--line)",
    font: "inherit",
  };
}
