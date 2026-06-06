"use client";

import { useFeedStore } from "./feedStore";
import { paneHeaderStyle } from "./paneStyles";
import { useAgentStats } from "./useAgentStats";
import { TipButton } from "./vending/TipButton";
import { useAccount } from "wagmi";
import { AGENTS, type AgentMeta } from "~~/services/agents/registry";

/** One leaderboard row: on-chain calls + 👍 + tips (all persist across refresh) + rate & tip buttons. */
const fmtUsd = (micro: number) => `$${(micro / 1e6).toFixed(2)}`;

function LeaderEntry({
  agent,
  rank,
  calls,
  upvotes,
  tipMicro,
  onRate,
  canRate,
}: {
  agent: AgentMeta;
  rank: number;
  calls: number;
  upvotes: number;
  tipMicro: number;
  onRate: (id: number) => void;
  canRate: boolean;
}) {
  const top = rank === 1 && (upvotes > 0 || calls > 0);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "22px 1fr auto",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderLeft: `3px solid ${top ? "var(--monad)" : "var(--line-strong)"}`,
        borderRadius: 14,
        boxShadow: "var(--shadow)",
      }}
    >
      <span
        className="tnum"
        style={{ fontSize: 13, fontWeight: 700, color: rank <= 3 ? "var(--monad)" : "var(--text-lo)" }}
      >
        #{rank}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden>{agent.glyph}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {agent.name}
          </span>
        </div>
        <div className="tnum" style={{ fontSize: 11, color: "var(--text-lo)" }}>
          {calls} calls · {upvotes} 👍
          {tipMicro > 0 && <span style={{ color: "var(--tip)" }}> · 💗 {fmtUsd(tipMicro)}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button
          onClick={() => onRate(agent.agentId)}
          disabled={!canRate}
          title={canRate ? `Rate ${agent.name} 👍 (writes on-chain)` : "Connect a wallet to rate"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "5px 10px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            cursor: canRate ? "pointer" : "not-allowed",
            color: canRate ? "var(--monad-deep)" : "var(--text-lo)",
            background: "color-mix(in oklab, var(--monad) 12%, transparent)",
            border: "1px solid color-mix(in oklab, var(--monad) 30%, transparent)",
          }}
        >
          👍<span className="tnum">{upvotes}</span>
        </button>
        <TipButton agent={agent} variant="chip" />
      </div>
    </div>
  );
}

export function Leaderboard() {
  const settledCount = useFeedStore(s => s.settledCount);
  const tipsMicroUsdc = useFeedStore(s => s.tipsMicroUsdc);
  const tipCount = useFeedStore(s => s.tipCount);
  const { stats, rate } = useAgentStats();
  const { address } = useAccount();

  const ranked = [...AGENTS]
    .map(a => ({
      agent: a,
      calls: stats[a.agentId]?.calls ?? 0,
      up: stats[a.agentId]?.upvotes ?? 0,
      tips: stats[a.agentId]?.tips ?? 0,
    }))
    .sort((a, b) => b.up - a.up || b.calls - a.calls);

  const onRate = (id: number) => {
    rate(id).catch(() => {});
  };

  return (
    <section
      style={{
        background: "var(--bg-1)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderRadius: 18,
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
      }}
    >
      <header style={paneHeaderStyle}>
        Reputation <span style={{ color: "var(--text-lo)", fontWeight: 400 }}>· ERC-8004</span>
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
        {ranked.map((r, i) => (
          <LeaderEntry
            key={r.agent.id}
            agent={r.agent}
            rank={i + 1}
            calls={r.calls}
            upvotes={r.up}
            tipMicro={r.tips}
            onRate={onRate}
            canRate={Boolean(address)}
          />
        ))}

        <div style={{ marginTop: 8, padding: "12px", borderTop: "1px solid var(--line)" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.01em",
              color: "var(--text-lo)",
              marginBottom: 8,
            }}
          >
            Session stats
          </div>
          <Stat label="Settled (session)" value={String(settledCount)} />
          <Stat label="Tipped (session)" value={tipCount > 0 ? `${fmtUsd(tipsMicroUsdc)} · ${tipCount}` : "—"} />
          <Stat label="Agents live" value={String(AGENTS.length)} />
          <Stat label="Settlement" value="< 1s on Monad" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
      <span style={{ color: "var(--text-mid)" }}>{label}</span>
      <span className="tnum" style={{ fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}
