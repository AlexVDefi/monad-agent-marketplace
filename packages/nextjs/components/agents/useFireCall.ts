"use client";

import { useCallback } from "react";
import { useFeedStore } from "./feedStore";
import { type Phase, useAgentCall } from "~~/hooks/useAgentCall";
import type { AgentMeta } from "~~/services/agents/registry";

let seq = 0;
const newId = () => `c${++seq}-${Date.now()}`;

/** A random 32-byte id, generated CLIENT-side so the feed row owns its taskHash from creation. */
function randomTaskHash(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ("0x" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

/**
 * Bridges a storefront CALL → a feed row. Generates the taskHash up front (so the on-chain event
 * merges into this row, no duplicate), runs the x402 lifecycle with the agent's scheme (exact or
 * upto/metered), then patches the row with the ACTUAL settled amount + real cost on the 200.
 */
export function useFireCall() {
  const { call, ready, busy } = useAgentCall();
  const addRow = useFeedStore(s => s.addRow);
  const patchRow = useFeedStore(s => s.patchRow);
  const markSettled = useFeedStore(s => s.markSettled);

  const fire = useCallback(
    async (agent: AgentMeta, input: string, opts?: { onPhase?: (phase: Phase) => void }) => {
      const id = newId();
      const taskHash = randomTaskHash();
      addRow({
        id,
        agentId: agent.agentId,
        agentName: agent.name,
        glyph: agent.glyph,
        priceMicroUsdc: agent.priceMicroUsdc, // display estimate until the metered amount returns
        phase: "request",
        bornAt: Date.now(),
        source: "client",
        prompt: input,
        taskHash,
      });
      try {
        const res = await call(agent.id, input, {
          onPhase: p => {
            patchRow(id, { phase: p });
            opts?.onPhase?.(p);
          },
          taskHash,
          scheme: agent.scheme,
          maxMicroUsdc: agent.maxMicroUsdc,
        });
        // settledMicroUsdc is the ACTUAL charged amount (metered for upto). markSettled totals it.
        // res.txHash (the CallLogged heartbeat) lets the row link out immediately; if it's null the
        // CallLogged ws event still attaches it later (confirmFromChain merges by taskHash).
        patchRow(id, {
          output: res.output,
          priceMicroUsdc: res.settledMicroUsdc,
          costMicroUsdc: res.costMicroUsdc,
          ...(res.txHash ? { txHash: res.txHash } : {}),
        });
        markSettled(id);
        return res;
      } catch (e) {
        patchRow(id, { phase: "error", error: e instanceof Error ? e.message : "failed" });
        throw e;
      }
    },
    [call, addRow, patchRow, markSettled],
  );

  return { fire, ready, busy };
}
