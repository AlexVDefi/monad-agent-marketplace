"use client";

import { useState } from "react";
import { HistoryPanel } from "./HistoryPanel";
import { PaymentStream } from "./PaymentStream";
import { paneHeaderStyle } from "./paneStyles";

type Tab = "stream" | "history";

/**
 * Center column with two tabs: the live payment STREAM (the hero) and a per-wallet HISTORY of
 * prompts + results. PaymentStream stays mounted (hidden when on History) so its websocket feed
 * keeps running and never resets on tab switches.
 */
export function CenterPane() {
  const [tab, setTab] = useState<Tab>("stream");

  return (
    <section style={{ background: "var(--bg-1)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <header style={{ ...paneHeaderStyle, gap: 16 }}>
        <TabButton active={tab === "stream"} onClick={() => setTab("stream")}>
          Live stream
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          History
        </TabButton>
      </header>

      {/* keep the live feed mounted (ws stays alive); just hide it under History */}
      <div style={{ flex: 1, minHeight: 0, flexDirection: "column", display: tab === "stream" ? "flex" : "none" }}>
        <PaymentStream />
      </div>
      {tab === "history" && <HistoryPanel />}
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: "0 0 2px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.01em",
        color: active ? "var(--text-hi)" : "var(--text-lo)",
        borderBottom: `2px solid ${active ? "var(--monad)" : "transparent"}`,
      }}
    >
      {children}
    </button>
  );
}
