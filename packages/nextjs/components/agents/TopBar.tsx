"use client";

import { SettledCounter } from "./SettledCounter";
import { chipStyle } from "./paneStyles";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

export function TopBar() {
  return (
    <header
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 16px",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--monad)", fontSize: 18 }}>◣</span>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em" }}>AGENT BAZAAR</span>
      </div>

      <span style={chipStyle}>
        monad testnet · 10143
        <span className="anim-dot" style={{ color: "var(--settle)" }}>
          ●
        </span>
        live
      </span>

      <div style={{ flex: 1 }} />

      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-lo)", textTransform: "uppercase" }}>
          Σ settled
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
          <SettledCounter />
          <span style={{ fontSize: 12, color: "var(--text-mid)" }}>USDC</span>
        </div>
      </div>

      <RainbowKitCustomConnectButton />
    </header>
  );
}
