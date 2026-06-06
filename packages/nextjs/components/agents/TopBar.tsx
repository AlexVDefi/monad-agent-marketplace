"use client";

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
        <span style={{ fontSize: 20, lineHeight: 1 }}>🍬</span>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.005em" }}>Agent Bazaar</span>
      </div>

      <span style={chipStyle}>
        Monad testnet · 10143
        <span
          className="anim-dot"
          style={{ width: 7, height: 7, borderRadius: 999, background: "var(--settle)", display: "inline-block" }}
        />
        live
      </span>

      <div style={{ flex: 1 }} />

      <RainbowKitCustomConnectButton />
    </header>
  );
}
