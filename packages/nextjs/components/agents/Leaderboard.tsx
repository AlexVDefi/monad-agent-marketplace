"use client";

import { useFeedStore } from "./feedStore";
import { paneHeaderStyle } from "./paneStyles";
import { useReputation } from "./useReputation";
import { useAccount } from "wagmi";
import { AGENTS, type AgentMeta } from "~~/services/agents/registry";

/** One leaderboard row: 👍 reputation (live) + this session's settled calls (live) + a rate button. */
function LeaderEntry({
  agent,
  rank,
  sessionCalls,
  upvotes,
  onRate,
  canRate,
}: {
  agent: AgentMeta;
  rank: number;
  sessionCalls: number;
  upvotes: number;
  onRate: (id: number) => void;
  canRate: boolean;
}) {
  const top = rank === 1 && (upvotes > 0 || sessionCalls > 0);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "22px 1fr auto",
        alignItems: "center",
        gap: 8,
        padding: "9px 10px",
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderLeft: `2px solid ${top ? "var(--monad)" : "var(--line)"}`,
        borderRadius: 8,
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
          {sessionCalls} calls · {upvotes} 👍
        </div>
      </div>
      <button
        onClick={() => onRate(agent.agentId)}
        disabled={!canRate}
        title={canRate ? `Rate ${agent.name} 👍 (writes on-chain)` : "Connect a wallet to rate"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "5px 9px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          cursor: canRate ? "pointer" : "not-allowed",
          color: canRate ? "var(--monad-bright)" : "var(--text-lo)",
          background: "color-mix(in oklab, var(--monad) 12%, transparent)",
          border: "1px solid var(--line-strong)",
        }}
      >
        👍<span className="tnum">{upvotes}</span>
      </button>
    </div>
  );
}

export function Leaderboard() {
  const settledCount = useFeedStore(s => s.settledCount); // low-freq trigger
  const { upvotes, rate } = useReputation();
  const { address } = useAccount();

  // recompute per-agent session tallies without subscribing to the fast rows array
  const rows = useFeedStore.getState().rows;
  const tally = new Map<number, number>();
  for (const r of rows) if (r.phase === "settled") tally.set(r.agentId, (tally.get(r.agentId) ?? 0) + 1);

  const ranked = [...AGENTS]
    .map(a => ({ agent: a, sessionCalls: tally.get(a.agentId) ?? 0, up: upvotes[a.agentId] ?? 0 }))
    .sort((a, b) => b.up - a.up || b.sessionCalls - a.sessionCalls);

  const onRate = (id: number) => {
    rate(id).catch(() => {});
  };

  return (
    <section style={{ background: "var(--bg-1)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <header style={paneHeaderStyle}>
        reputation <span style={{ color: "var(--text-lo)", fontWeight: 400 }}>· ERC-8004</span>
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
            sessionCalls={r.sessionCalls}
            upvotes={r.up}
            onRate={onRate}
            canRate={Boolean(address)}
          />
        ))}

        <div style={{ marginTop: 8, padding: "12px", borderTop: "1px solid var(--line)" }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-lo)",
              marginBottom: 8,
            }}
          >
            session stats
          </div>
          <Stat label="settled calls" value={String(settledCount)} />
          <Stat label="agents live" value={String(AGENTS.length)} />
          <Stat label="settlement" value="< 1s on Monad" />
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
