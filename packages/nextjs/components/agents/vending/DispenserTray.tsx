"use client";

import { TipButton } from "./TipButton";
import { useVendingStore } from "./vendingStore";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/16/solid";
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
        gap: 6,
        padding: "9px 11px",
      }}
    >
      {/* compact one-line header: status + agent + price (keeps the output the hero) */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            color: isError ? "var(--danger)" : "var(--settle)",
          }}
        >
          {isError ? (
            <XCircleIcon aria-hidden style={{ width: 13, height: 13 }} />
          ) : (
            <CheckCircleIcon aria-hidden style={{ width: 13, height: 13 }} />
          )}
          {isError ? "Jammed" : "Dispensed"}
        </span>
        {agent && (
          <span aria-hidden style={{ fontSize: 14, flexShrink: 0 }}>
            {agent.glyph}
          </span>
        )}
        {agent && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {agent.name}
          </span>
        )}
        {!isError && result?.settledMicroUsdc != null && (
          <span className="tnum" style={{ fontSize: 11, color: "var(--settle)", flexShrink: 0 }}>
            paid {agent?.priceUsd}
          </span>
        )}
      </div>

      {/* the dispensed output — the hero, fills the tray card and scrolls if long */}
      <div
        key={phase} // re-trigger the drop animation on each vend
        className="vending-drop ui-font"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${isError ? "var(--danger)" : "var(--settle)"}`,
          background: "color-mix(in oklab, var(--bg-2) 88%, transparent)",
          boxShadow: isError ? "none" : "0 0 18px var(--settle-glow)",
          fontSize: 13,
          lineHeight: 1.5,
          color: isError ? "var(--danger)" : "var(--text-hi)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {isError ? error : result?.output}
      </div>

      {/* tip the agent you just liked — only after a clean dispense (opens the shared tip dialog) */}
      {!isError && agent && <TipButton agent={agent} variant="block" />}

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {isError ? (
          <button onClick={retry} className="vending-pay" style={trayBtn(true)}>
            Try again
          </button>
        ) : (
          <button onClick={reset} className="vending-pay" style={trayBtn(true)}>
            Vend another
          </button>
        )}
        <button onClick={reset} style={trayBtn(false)}>
          Menu
        </button>
      </div>
    </div>
  );
}

function trayBtn(primary: boolean): React.CSSProperties {
  return {
    flex: primary ? 1 : "0 0 auto",
    padding: "10px 16px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    cursor: "pointer",
    border: "1px solid transparent",
    color: primary ? "#fff" : "var(--text-mid)",
    background: primary ? "var(--monad)" : "var(--bg-2)",
    borderColor: primary ? "transparent" : "var(--line)",
    font: "inherit",
  };
}
