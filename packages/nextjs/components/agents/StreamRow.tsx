import { memo, useEffect, useRef, useState } from "react";
import { PhasePill } from "./PhasePill";
import type { FeedRow } from "./feedStore";
import { ArrowTopRightOnSquareIcon, ChevronDownIcon, ChevronRightIcon, HeartIcon } from "@heroicons/react/16/solid";

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

/** Tip rows aren't an x402 lifecycle — they land already-settled, so they get their own pill. */
function TipPill() {
  return (
    <span
      className="tnum"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        width: 96,
        height: 24,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.01em",
        color: "var(--tip)",
        background: "color-mix(in oklab, var(--tip) 14%, transparent)",
        border: "1px solid color-mix(in oklab, var(--tip) 38%, transparent)",
      }}
    >
      <HeartIcon aria-hidden style={{ width: 12, height: 12 }} />
      <span>Tip</span>
    </span>
  );
}

export const StreamRow = memo(function StreamRow({ row }: { row: FeedRow }) {
  const isTip = row.kind === "tip";
  const settled = row.phase === "settled";
  const failed = row.phase === "error";
  const expandable = Boolean(row.prompt || row.output);
  const [open, setOpen] = useState(false);

  const accent = isTip ? "var(--tip)" : "var(--settle)";

  return (
    <div
      className={`stream-row anim-row-enter ${settled && !isTip ? "anim-settle-glow" : ""}`}
      style={{
        borderBottom: "1px solid var(--line)",
        background: isTip
          ? "color-mix(in oklab, var(--tip) 7%, var(--bg-2))"
          : settled
            ? "color-mix(in oklab, var(--settle) 6%, var(--bg-2))"
            : "var(--bg-2)",
        borderLeft: `3px solid ${isTip ? "var(--tip)" : settled ? "var(--settle)" : failed ? "var(--danger)" : "transparent"}`,
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
        {isTip ? <TipPill /> : <PhasePill phase={row.phase} />}

        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {expandable &&
            (open ? (
              <ChevronDownIcon aria-hidden style={{ width: 12, height: 12, color: "var(--text-lo)", flexShrink: 0 }} />
            ) : (
              <ChevronRightIcon aria-hidden style={{ width: 12, height: 12, color: "var(--text-lo)", flexShrink: 0 }} />
            ))}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            color: isTip ? "var(--tip)" : settled ? "var(--settle)" : "var(--text-hi)",
            transition: "color 220ms var(--ease-out)",
          }}
        >
          {isTip && <HeartIcon aria-hidden style={{ width: 11, height: 11 }} />}
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
              style={{
                color: accent,
                textDecoration: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                justifyContent: "flex-end",
              }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              <ArrowTopRightOnSquareIcon aria-hidden style={{ width: 11, height: 11, flexShrink: 0 }} />
              {short(row.txHash)}
            </a>
          ) : isTip ? (
            <span style={{ color: "var(--tip)" }}>tipped</span>
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
              <Label>Prompt</Label>
              <Body color="var(--text-mid)">{row.prompt}</Body>
            </div>
          )}
          {row.error ? (
            <div>
              <Label danger>Error</Label>
              <Body color="var(--text-mid)">{row.error}</Body>
            </div>
          ) : row.output ? (
            <div>
              <Label>Result</Label>
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
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.01em",
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
