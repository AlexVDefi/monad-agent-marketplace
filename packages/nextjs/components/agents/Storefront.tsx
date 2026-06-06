"use client";

import { AgentCard } from "./AgentCard";
import { AgentSwarm } from "./AgentSwarm";
import { DemoStorm } from "./DemoStorm";
import { paneHeaderStyle } from "./paneStyles";
import { AGENTS } from "~~/services/agents/registry";

export function Storefront() {
  return (
    <section style={{ background: "var(--bg-1)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <header style={paneHeaderStyle}>
        storefront <span style={{ color: "var(--text-lo)", fontWeight: 400 }}>· pay-per-call</span>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 0,
        }}
      >
        {AGENTS.map(a => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
      <div
        style={{ padding: 16, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}
      >
        <AgentSwarm />
        <DemoStorm />
      </div>
    </section>
  );
}
