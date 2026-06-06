"use client";

import { useVendingStore } from "./vendingStore";
import { AGENTS, type AgentMeta } from "~~/services/agents/registry";

/** One selectable agent row, styled to read as a glowing on-screen menu entry. */
function AgentTile({ agent, onPick }: { agent: AgentMeta; onPick: (id: string) => void }) {
  const isLlm = agent.kind === "llm";
  return (
    <button
      onClick={() => onPick(agent.id)}
      className="vending-tile"
      style={{
        display: "grid",
        gridTemplateColumns: "22px minmax(0, 1fr)",
        alignItems: "center",
        columnGap: 6,
        rowGap: 1,
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "color-mix(in oklab, var(--bg-2) 78%, transparent)",
        color: "var(--text-hi)",
        cursor: "pointer",
        font: "inherit",
      }}
    >
      <span aria-hidden style={{ gridRow: "1 / 3", fontSize: 18, textAlign: "center" }}>
        {agent.glyph}
      </span>
      {/* line 1: name (full width, ellipsis) */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {agent.name}
      </span>
      {/* line 2: price + kind + blurb */}
      <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
        <span className="tnum" style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--monad-bright)" }}>
          {agent.priceUsd}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.01em",
            color: isLlm ? "var(--monad-bright)" : "var(--settle)",
          }}
        >
          {isLlm ? "LLM" : "Instant"}
        </span>
        <span
          className="ui-font"
          style={{
            fontSize: 10,
            color: "var(--text-mid)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {agent.blurb}
        </span>
      </span>
    </button>
  );
}

/** The agent menu projected onto the machine's screen panel. Picking an agent → keypad. */
export function AgentGridPanel() {
  const select = useVendingStore(s => s.select);
  const loaded = useVendingStore(s => s.loaded);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 10px",
        opacity: loaded ? 1 : 0.55,
        transition: "opacity 300ms var(--ease-out)",
        pointerEvents: loaded ? "auto" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.01em",
          color: "var(--settle)",
          whiteSpace: "nowrap",
        }}
      >
        <span>Pick an agent</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {AGENTS.map(a => (
          <AgentTile key={a.id} agent={a} onPick={select} />
        ))}
      </div>
    </div>
  );
}
