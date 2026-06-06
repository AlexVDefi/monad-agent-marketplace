"use client";

import { useFeedStore } from "./feedStore";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.monadexplorer.com";
const short = (h?: string) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");
const usd = (micro: number) => (micro / 1e6).toFixed(micro % 1000 === 0 ? 3 : 4);
const clock = (ts: number) => {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "";
  }
};

/**
 * Agent History — every prompt + result this wallet has run, newest first. Driven by the persisted
 * feed (localStorage per wallet), so it survives a refresh. Only the wallet's own calls (which carry
 * a prompt/output) show here; the autonomous swarm/foreign calls live in the live stream.
 */
export function HistoryPanel() {
  const rows = useFeedStore(s => s.rows);
  const history = rows.filter(r => r.source === "client" && (r.prompt || r.output || r.error));

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
      }}
    >
      {history.length === 0 ? (
        <div
          className="ui-font"
          style={{
            margin: "auto",
            textAlign: "center",
            color: "var(--text-lo)",
            fontSize: 13,
            maxWidth: 320,
            lineHeight: 1.6,
          }}
        >
          No calls yet. Hire an agent — your prompts, results, and on-chain receipts collect here, saved per wallet and
          restored on refresh.
        </div>
      ) : (
        history.map(r => (
          <div
            key={r.id}
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderLeft: `2px solid ${r.phase === "error" ? "var(--danger)" : "var(--settle)"}`,
              borderRadius: 8,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden>{r.glyph}</span>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{r.agentName}</span>
              <span
                className="tnum"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: r.phase === "error" ? "var(--danger)" : "var(--settle)",
                }}
              >
                {usd(r.priceMicroUsdc)} USDC
              </span>
            </div>

            {r.prompt && (
              <div>
                <Label>prompt</Label>
                <Body color="var(--text-mid)">{r.prompt}</Body>
              </div>
            )}
            {r.error ? (
              <div>
                <Label danger>error</Label>
                <Body color="var(--text-mid)">{r.error}</Body>
              </div>
            ) : r.output ? (
              <div>
                <Label>result</Label>
                <Body color="var(--text-hi)">{r.output}</Body>
              </div>
            ) : null}

            <div
              className="tnum"
              style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-lo)" }}
            >
              <span>{clock(r.bornAt)}</span>
              {r.txHash ? (
                <a
                  href={`${EXPLORER}/tx/${r.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--settle)", textDecoration: "none" }}
                >
                  ↗ {short(r.txHash)}
                </a>
              ) : (
                <span>{r.phase}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Label({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: danger ? "var(--danger)" : "var(--text-lo)",
        marginBottom: 3,
      }}
    >
      {children}
    </div>
  );
}

function Body({ children, color }: { children: React.ReactNode; color: string }) {
  return <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color, wordBreak: "break-word" }}>{children}</p>;
}
