import { memo, useEffect, useRef, useState } from "react";
import { PhasePill } from "./PhasePill";
import type { FeedRow } from "./feedStore";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.monadexplorer.com";

const short = (h?: string) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");

const usd = (micro: number) => {
  const v = micro / 1e6;
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
  const expandable = Boolean(row.prompt || row.output);
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`stream-row anim-row-enter ${settled ? "anim-settle-glow" : ""}`}
      style={{
        borderBottom: "1px solid var(--line)",
        background: settled ? "color-mix(in oklab, var(--settle) 6%, var(--bg-2))" : "var(--bg-2)",
        borderLeft: `3px solid ${settled ? "var(--settle)" : failed ? "var(--danger)" : "transparent"}`,
      }}
    >
      <div
        onClick={expandable ? () => setOpen(o => !o) : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: "100px 1fr 76px 96px",
          alignItems: "center",
          gap: 12,
          height: 44,
          padding: "0 12px",
          cursor: expandable ? "pointer" : "default",
        }}
      >
        <PhasePill phase={row.phase} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {expandable && (
            <span aria-hidden style={{ color: "var(--text-lo)", fontSize: 10, width: 8 }}>
              {open ? "▾" : "▸"}
            </span>
          )}
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
              onClick={e => e.stopPropagation()}
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

      {open && expandable && (
        <div
          className="ui-font anim-row-enter"
          style={{ padding: "0 12px 12px 115px", display: "flex", flexDirection: "column", gap: 8 }}
        >
          {row.prompt && (
            <div>
              <Label>prompt</Label>
              <Body color="var(--text-mid)">{row.prompt}</Body>
            </div>
          )}
          {row.error ? (
            <div>
              <Label danger>error</Label>
              <Body color="var(--text-mid)">{row.error}</Body>
            </div>
          ) : row.output ? (
            <div>
              <Label>result</Label>
              <Body color="var(--text-hi)">{row.output}</Body>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});

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
