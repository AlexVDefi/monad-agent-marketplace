"use client";

import { useCallback } from "react";
import { useFeedStore } from "./feedStore";
import { useAgentCall } from "~~/hooks/useAgentCall";
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
 * Bridges a storefront CALL → a feed row. The taskHash is generated up front and set on the row
 * immediately, then sent to the server (used for logCall + echoed back), so the on-chain CallLogged
 * event merges into THIS row instead of creating a duplicate. Marks settled on the 200 (payment
 * settled on Monad); the ws event attaches the explorer tx.
 */
export function useFireCall() {
  const { call, ready, busy } = useAgentCall();
  const addRow = useFeedStore(s => s.addRow);
  const patchRow = useFeedStore(s => s.patchRow);
  const markSettled = useFeedStore(s => s.markSettled);

  const fire = useCallback(
    async (agent: AgentMeta, input: string) => {
      const id = newId();
      const taskHash = randomTaskHash();
      addRow({
        id,
        agentId: agent.agentId,
        agentName: agent.name,
        glyph: agent.glyph,
        priceMicroUsdc: agent.priceMicroUsdc,
        phase: "request",
        bornAt: Date.now(),
        source: "client",
        prompt: input,
        taskHash,
      });
      try {
        const res = await call(agent.id, input, { onPhase: p => patchRow(id, { phase: p }), taskHash });
        patchRow(id, { output: res.output });
        markSettled(id); // 200 = USDC settled on Monad; the ws CallLogged event attaches the explorer tx
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
