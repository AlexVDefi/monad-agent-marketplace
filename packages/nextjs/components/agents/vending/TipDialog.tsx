"use client";

import { useEffect, useMemo, useState } from "react";
import { useTipDialog } from "./tipDialogStore";
import { ArrowTopRightOnSquareIcon, HeartIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { useTipAgent } from "~~/hooks/useTipAgent";

/**
 * The one shared tip modal, mounted once at the terminal root and raised from any surface via
 * useTipDialog.open(agent) — the dispenser tray AND the leaderboard rate row use it, so the tip flow
 * is identical everywhere. Preset chips + a custom amount; the real USDC transfer + on-chain log run
 * inside useTipAgent. USDC is 6-decimals, so amounts are micro-USDC (1 USDC = 1_000_000).
 */
const PRESETS: { label: string; micro: number }[] = [
  { label: "$0.10", micro: 100_000 },
  { label: "$0.50", micro: 500_000 },
  { label: "$1.00", micro: 1_000_000 },
];
const MAX_MICRO = 100_000_000; // $100 fat-finger guard

const fmtUsd = (micro: number) => `$${(micro / 1e6).toFixed(2)}`;
const short = (h?: string) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");

export function TipDialog() {
  const agent = useTipDialog(s => s.agent);
  const close = useTipDialog(s => s.close);
  const { tip, reset, state, ready, explorerBase } = useTipAgent();

  const [presetMicro, setPresetMicro] = useState<number>(PRESETS[1].micro);
  const [custom, setCustom] = useState("");

  // Fresh dialog each time it opens on a (possibly new) agent.
  useEffect(() => {
    reset();
    setCustom("");
    setPresetMicro(PRESETS[1].micro);
  }, [agent?.agentId, reset]);

  const customMicro = useMemo(() => {
    const t = custom.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(Math.round(n * 1e6), MAX_MICRO);
  }, [custom]);
  const amountMicro = customMicro ?? presetMicro;
  const customInvalid = custom.trim() !== "" && customMicro === null;

  const { phase } = state;
  const busy = phase === "signing" || phase === "pending";

  // Esc closes when idle; Enter sends.
  useEffect(() => {
    if (!agent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) close();
      if (e.key === "Enter" && ready && !busy && !customInvalid && phase !== "confirmed") tip(agent, amountMicro);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [agent, busy, ready, customInvalid, phase, amountMicro, tip, close]);

  if (!agent) return null;

  return (
    <div
      onClick={() => !busy && close()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(58, 46, 74, 0.28)",
        backdropFilter: "blur(3px)",
        animation: "row-enter 160ms var(--ease-io)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="anim-coin"
        style={{
          width: "min(420px, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 18,
          borderRadius: 18,
          border: "1px solid color-mix(in oklab, var(--tip) 34%, var(--line-strong))",
          background: "linear-gradient(180deg, color-mix(in oklab, var(--tip) 8%, var(--bg-2)) 0%, var(--bg-2) 60%)",
          boxShadow: "0 24px 60px rgba(58,46,74,0.18), 0 0 40px var(--tip-glow)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden style={{ fontSize: 22 }}>
            {agent.glyph}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{agent.name}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "var(--tip)",
                letterSpacing: "0.01em",
              }}
            >
              <HeartIcon aria-hidden style={{ width: 11, height: 11 }} /> Tip in USDC · settles on Monad
            </div>
          </div>
          {!busy && (
            <button onClick={close} aria-label="Close" style={iconBtn}>
              <XMarkIcon aria-hidden style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>

        {phase === "confirmed" ? (
          <ConfirmedBody
            micro={state.microUsdc ?? 0}
            txHash={state.txHash}
            explorerBase={explorerBase}
            onAgain={() => {
              reset();
              setCustom("");
            }}
            onClose={close}
          />
        ) : (
          <>
            {/* amount chips + custom */}
            <div style={{ display: "flex", gap: 8 }}>
              {PRESETS.map(p => {
                const active = customMicro === null && presetMicro === p.micro;
                return (
                  <button
                    key={p.micro}
                    disabled={busy}
                    onClick={() => {
                      setPresetMicro(p.micro);
                      setCustom("");
                    }}
                    className="tip-chip tnum"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 800,
                      color: active ? "#fff" : "var(--text-mid)",
                      background: active ? "var(--tip)" : "var(--bg-2)",
                      border: `1px solid ${active ? "var(--tip)" : "var(--line)"}`,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  width: 92,
                  padding: "0 10px",
                  borderRadius: 12,
                  background: "var(--bg-0)",
                  border: `1px solid ${
                    customInvalid ? "var(--danger)" : customMicro !== null ? "var(--tip)" : "var(--line)"
                  }`,
                }}
              >
                <span style={{ color: "var(--text-lo)", fontSize: 14 }}>$</span>
                <input
                  value={custom}
                  onChange={e => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                  disabled={busy}
                  inputMode="decimal"
                  placeholder="custom"
                  className="ui-font tnum"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-hi)",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            {phase === "error" && state.error && (
              <div style={{ fontSize: 12, color: "var(--danger)", lineHeight: 1.45 }}>{state.error}</div>
            )}

            <button
              onClick={() => tip(agent, amountMicro)}
              disabled={!ready || busy || customInvalid}
              className="tip-send"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "13px 14px",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.01em",
                cursor: !ready || busy || customInvalid ? "not-allowed" : "pointer",
                color: !ready || customInvalid ? "var(--text-lo)" : "#fff",
                background:
                  !ready || customInvalid
                    ? "var(--bg-3)"
                    : busy
                      ? "color-mix(in oklab, var(--tip) 60%, #000)"
                      : "var(--tip)",
                border: "1px solid transparent",
                font: "inherit",
                transition: "background 120ms var(--ease-out), transform 80ms var(--ease-snap)",
              }}
            >
              {!ready ? (
                "Connect wallet to tip"
              ) : phase === "signing" ? (
                "Confirm transfer in wallet…"
              ) : phase === "pending" ? (
                `Settling ${short(state.txHash)}…`
              ) : phase === "error" ? (
                "Try again"
              ) : (
                <>
                  <HeartIcon aria-hidden style={{ width: 15, height: 15 }} /> Send {fmtUsd(amountMicro)} tip
                </>
              )}
            </button>

            <div style={{ fontSize: 10, color: "var(--text-lo)", textAlign: "center", lineHeight: 1.4 }}>
              one wallet signature · goes to the agent wallet · recorded on-chain as a Tipped event
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmedBody({
  micro,
  txHash,
  explorerBase,
  onAgain,
  onClose,
}: {
  micro: number;
  txHash?: `0x${string}`;
  explorerBase: string;
  onAgain: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", padding: "8px 0 2px" }}>
      <HeartIcon aria-hidden className="anim-heart" style={{ width: 44, height: 44, color: "var(--tip)" }} />
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--tip)" }}>Tipped {fmtUsd(micro)} — thank you!</div>
      {txHash && (
        <a
          href={`${explorerBase}/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="tnum"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontSize: 12,
            color: "var(--tip)",
            textDecoration: "none",
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
        >
          <ArrowTopRightOnSquareIcon aria-hidden style={{ width: 11, height: 11 }} /> View transfer {short(txHash)}
        </a>
      )}
      <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 2 }}>
        <button onClick={onAgain} className="tip-chip" style={{ ...pillBtn, color: "var(--tip)" }}>
          Tip again
        </button>
        <button
          onClick={onClose}
          className="tip-send"
          style={{ ...pillBtn, color: "#fff", background: "var(--tip)", border: "1px solid transparent" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--line)",
  background: "var(--bg-2)",
  color: "var(--text-mid)",
  borderRadius: 10,
  width: 30,
  height: 30,
  fontSize: 13,
  cursor: "pointer",
  font: "inherit",
  flexShrink: 0,
};

const pillBtn: React.CSSProperties = {
  flex: 1,
  padding: "11px 14px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.01em",
  cursor: "pointer",
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  font: "inherit",
};
