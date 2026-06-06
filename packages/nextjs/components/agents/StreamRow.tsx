import { memo, useEffect, useRef } from "react";
import { PhasePill } from "./PhasePill";
import type { FeedRow } from "./feedStore";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.monadexplorer.com";

const short = (h?: string) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");

const usd = (micro: number) => {
  const v = micro / 1e6;
  // show enough precision that a $0.001 call visibly bumps the digits
  return v.toFixed(micro % 1000 === 0 ? 3 : 4);
};

/** Ref-driven elapsed timer — writes textContent on rAF, never setState. Unmounts once settled. */
function Timer({ bornAt }: { bornAt: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (ref.current) ref.current.textContent = `${((Date.now() - bornAt) / 1000).toFixed(2)}s`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bornAt]);
  return (
    <span ref={ref} className="tnum">
      0.00s
    </span>
  );
}

export const StreamRow = memo(function StreamRow({ row }: { row: FeedRow }) {
  const settled = row.phase === "settled";
  const failed = row.phase === "error";
  return (
    <div
      className={`stream-row anim-row-enter ${settled ? "anim-settle-glow" : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: "100px 1fr 76px 96px",
        alignItems: "center",
        gap: 12,
        height: 44,
        padding: "0 12px",
        borderBottom: "1px solid var(--line)",
        background: settled ? "color-mix(in oklab, var(--settle) 6%, var(--bg-2))" : "var(--bg-2)",
        borderLeft: `3px solid ${settled ? "var(--settle)" : failed ? "var(--danger)" : "transparent"}`,
      }}
      title={row.output || undefined}
    >
      <PhasePill phase={row.phase} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span aria-hidden style={{ fontSize: 13 }}>
          {row.glyph}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {row.agentName}
        </span>
      </div>

      <div
        className="tnum"
        style={{
          fontSize: 14,
          fontWeight: 700,
          textAlign: "right",
          color: settled ? "var(--settle)" : "var(--text-hi)",
          transition: "color 220ms var(--ease-out)",
        }}
      >
        {usd(row.priceMicroUsdc)}
      </div>

      <div className="tnum" style={{ fontSize: 12, textAlign: "right", color: "var(--text-lo)" }}>
        {row.txHash ? (
          <a
            className="anim-link-in"
            href={`${EXPLORER}/tx/${row.txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--settle)", textDecoration: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
          >
            ↗ {short(row.txHash)}
          </a>
        ) : failed ? (
          <span style={{ color: "var(--danger)" }}>{row.error ? "error" : "retry"}</span>
        ) : settled ? (
          <span style={{ color: "var(--settle)" }}>settled</span>
        ) : (
          <Timer bornAt={row.bornAt} />
        )}
      </div>
    </div>
  );
});
