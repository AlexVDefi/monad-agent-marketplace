"use client";

import { useCallback, useState } from "react";
import { useVendingStore } from "./vendingStore";
import { useFireCall } from "~~/components/agents/useFireCall";
import { getAgent } from "~~/services/agents/registry";

/**
 * Sample inputs so an empty prompt still produces a meaningful demo result (mirrors AgentCard's
 * fallback). Keeps the keypad panel "dumb" — it just calls payAndVend().
 */
const SAMPLE: Record<string, string> = {
  stamp: "Agent Bazaar — Monad Blitz Lisbon, 6 Jun 2026.",
  tldr: "Monad is a high-performance, EVM-compatible layer-1 with parallel execution, an asynchronous pipeline, and sub-second finality, targeting 10,000 TPS while staying fully bytecode-compatible with Ethereum.",
  sentiment:
    "This live payment stream is mesmerizing — micropayments settling in under a second is exactly the future I want to build.",
};

/**
 * Controller that bridges the vending overlay to the REAL payment pipeline. Wraps useFireCall (the
 * same hook AgentCard uses), so the feed row, phase pills, PaymentStream, Σ counter, Leaderboard and
 * the on-chain CallLogged confirmation all keep working untouched. On success it drops the result
 * into the vending store (→ dispenser tray); on failure it surfaces the error in the tray.
 */
export function useVendingFire() {
  const { fire, ready } = useFireCall();
  const [busy, setBusy] = useState(false);

  const selectedAgentId = useVendingStore(s => s.selectedAgentId);
  const prompt = useVendingStore(s => s.prompt);
  const startPaying = useVendingStore(s => s.startPaying);
  const insertCoin = useVendingStore(s => s.insertCoin);
  const settleResult = useVendingStore(s => s.settleResult);
  const fail = useVendingStore(s => s.fail);

  const payAndVend = useCallback(async () => {
    const agent = selectedAgentId ? getAgent(selectedAgentId) : undefined;
    if (!agent || busy || !ready) return;

    setBusy(true);
    startPaying();
    try {
      const input = prompt.trim() || SAMPLE[agent.id] || "hello";
      // "signed" fires the instant the buyer confirms in the wallet → drop the coin into the slot.
      const res = await fire(agent, input, {
        onPhase: p => {
          if (p === "signed") insertCoin();
        },
      });
      // Hand the output to the store; it flips to the tray once the coin animation has also finished.
      settleResult({ output: res.output, taskHash: res.taskHash, settledMicroUsdc: res.settledMicroUsdc });
    } catch (e) {
      fail(e instanceof Error ? e.message : "payment failed");
    } finally {
      setBusy(false);
    }
  }, [selectedAgentId, prompt, busy, ready, fire, startPaying, insertCoin, settleResult, fail]);

  return { payAndVend, ready, busy };
}
