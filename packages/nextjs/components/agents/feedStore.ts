import { create } from "zustand";
import type { Phase } from "~~/hooks/useAgentCall";

/**
 * The live feed store. Per the design brief: fast-ticking state lives LOW in the tree — only
 * <PaymentStream> subscribes to `rows`, so the storefront/leaderboard never re-render on a tick.
 * The list is hard-capped at 40 so the DOM never grows unbounded.
 *
 * Settlement is idempotent and order-independent: a row can settle from the 200 response
 * (markSettled) and/or from the on-chain CallLogged websocket event (confirmFromChain), in either
 * order, and the total is counted exactly once.
 */
export interface FeedRow {
  id: string;
  agentId: number;
  agentName: string;
  glyph: string;
  priceMicroUsdc: number;
  phase: Phase;
  /** "call" (an x402 agent payment, the default) or "tip" (a viewer-sent USDC bonus). */
  kind?: "call" | "tip";
  taskHash?: `0x${string}`;
  txHash?: `0x${string}`;
  prompt?: string;
  output?: string;
  /** Actual API cost in micro-USDC (metered agents); compare to priceMicroUsdc for margin. */
  costMicroUsdc?: number;
  error?: string;
  bornAt: number;
  source: "client" | "chain";
}

export const MAX_ROWS = 40;

interface ChainConfirm {
  taskHash: string;
  txHash: `0x${string}`;
  agentId: number;
  priceMicroUsdc: number;
  agentName?: string;
  glyph?: string;
}

interface TipInput {
  agentId: number;
  agentName: string;
  glyph: string;
  microUsdc: number;
  /** The USDC transfer tx hash — both the explorer link and the dedup key vs the Tipped event. */
  txHash: `0x${string}`;
}

interface TipChainConfirm {
  /** The USDC transfer tx hash carried in the Tipped event's `ref` — matches a local tip row's id. */
  ref: `0x${string}`;
  agentId: number;
  microUsdc: number;
  agentName?: string;
  glyph?: string;
}

interface FeedState {
  rows: FeedRow[];
  totalMicroUsdc: number;
  settledCount: number;
  /**
   * Session tip totals (kept separate from call settlements so the Σ stays "agent revenue"). These
   * are this-session counters; the authoritative PER-AGENT tip totals come from chain (useAgentStats).
   */
  tipsMicroUsdc: number;
  tipCount: number;
  addRow: (row: FeedRow) => void;
  patchRow: (id: string, patch: Partial<FeedRow>) => void;
  /** Called on the 200 response: payment settled on Monad. Idempotent; counts the total once. */
  markSettled: (id: string) => void;
  /** Called from the CallLogged ws event: attaches the explorer tx, or adds a foreign settled row. */
  confirmFromChain: (c: ChainConfirm) => void;
  /** Our own confirmed tip → streams a tip row + bumps the session tip totals (instant feedback). */
  addTip: (tip: TipInput) => void;
  /** Tipped ws event: dedups our own tip row, or streams in a tip made on another device. */
  confirmTipFromChain: (c: TipChainConfirm) => void;
}

export const useFeedStore = create<FeedState>(set => ({
  rows: [],
  totalMicroUsdc: 0,
  settledCount: 0,
  tipsMicroUsdc: 0,
  tipCount: 0,

  addRow: row => set(s => ({ rows: [row, ...s.rows].slice(0, MAX_ROWS) })),

  patchRow: (id, patch) => set(s => ({ rows: s.rows.map(r => (r.id === id ? { ...r, ...patch } : r)) })),

  markSettled: id =>
    set(s => {
      const row = s.rows.find(r => r.id === id);
      if (!row || row.phase === "settled") return s; // idempotent
      return {
        rows: s.rows.map(r => (r.id === id ? { ...r, phase: "settled" as Phase } : r)),
        totalMicroUsdc: s.totalMicroUsdc + row.priceMicroUsdc,
        settledCount: s.settledCount + 1,
      };
    }),

  confirmFromChain: ({ taskHash, txHash, agentId, priceMicroUsdc, agentName, glyph }) =>
    set(s => {
      const idx = s.rows.findIndex(r => r.taskHash?.toLowerCase() === taskHash.toLowerCase());
      if (idx >= 0) {
        const wasSettled = s.rows[idx].phase === "settled";
        const rows = s.rows.slice();
        rows[idx] = { ...rows[idx], phase: "settled", txHash };
        // If the ws event beat the 200, settle + count now; otherwise just attach the explorer tx.
        return wasSettled
          ? { rows }
          : {
              rows,
              totalMicroUsdc: s.totalMicroUsdc + rows[idx].priceMicroUsdc,
              settledCount: s.settledCount + 1,
            };
      }
      // No matching client row → a call made elsewhere (a Blink, another wallet). Add it settled.
      const row: FeedRow = {
        id: `chain:${txHash}:${taskHash.slice(0, 10)}`,
        agentId,
        agentName: agentName ?? `Agent #${agentId}`,
        glyph: glyph ?? "◆",
        priceMicroUsdc,
        phase: "settled",
        taskHash: taskHash as `0x${string}`,
        txHash,
        bornAt: Date.now(),
        source: "chain",
      };
      return {
        rows: [row, ...s.rows].slice(0, MAX_ROWS),
        totalMicroUsdc: s.totalMicroUsdc + priceMicroUsdc,
        settledCount: s.settledCount + 1,
      };
    }),

  addTip: ({ agentId, agentName, glyph, microUsdc, txHash }) =>
    set(s => {
      if (s.rows.some(r => r.id === `tip:${txHash}`)) return s; // already streamed (e.g. ws beat us)
      const row: FeedRow = {
        id: `tip:${txHash}`,
        kind: "tip",
        agentId,
        agentName,
        glyph,
        priceMicroUsdc: microUsdc,
        phase: "settled",
        txHash,
        bornAt: Date.now(),
        source: "client",
      };
      return {
        rows: [row, ...s.rows].slice(0, MAX_ROWS),
        tipsMicroUsdc: s.tipsMicroUsdc + microUsdc,
        tipCount: s.tipCount + 1,
      };
    }),

  confirmTipFromChain: ({ ref, agentId, microUsdc, agentName, glyph }) =>
    set(s => {
      // Our own tip already streamed via addTip (same id) → nothing to do; don't double-count.
      if (s.rows.some(r => r.id === `tip:${ref}`)) return s;
      // A tip from another wallet/device → stream it in. `ref` is the USDC transfer tx (the link).
      const row: FeedRow = {
        id: `tip:${ref}`,
        kind: "tip",
        agentId,
        agentName: agentName ?? `Agent #${agentId}`,
        glyph: glyph ?? "◆",
        priceMicroUsdc: microUsdc,
        phase: "settled",
        txHash: ref,
        bornAt: Date.now(),
        source: "chain",
      };
      return {
        rows: [row, ...s.rows].slice(0, MAX_ROWS),
        tipsMicroUsdc: s.tipsMicroUsdc + microUsdc,
        tipCount: s.tipCount + 1,
      };
    }),
}));
