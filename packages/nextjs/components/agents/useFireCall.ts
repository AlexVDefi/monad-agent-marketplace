"use client";

import { useCallback } from "react";
import { useFeedStore } from "./feedStore";
import { useAgentCall } from "~~/hooks/useAgentCall";
import type { AgentMeta } from "~~/services/agents/registry";

let seq = 0;
const newId = () => `c${++seq}-${Date.now()}`;

/**
 * Bridges a storefront CALL → a feed row whose phases (request → 402 → signed → settling) are driven
 * by the authentic x402 lifecycle, then marks it settled on the 200 (payment settled on Monad). The
 * on-chain CallLogged ws event later attaches the explorer tx via the matching taskHash.
 */
export function useFireCall() {
  const { call, ready, busy } = useAgentCall();
  const addRow = useFeedStore(s => s.addRow);
  const patchRow = useFeedStore(s => s.patchRow);
  const markSettled = useFeedStore(s => s.markSettled);

  const fire = useCallback(
    async (agent: AgentMeta, input: string) => {
      const id = newId();
      addRow({
        id,
        agentId: agent.agentId,
        agentName: agent.name,
        glyph: agent.glyph,
        priceMicroUsdc: agent.priceMicroUsdc,
        phase: "request",
        bornAt: Date.now(),
        source: "client",
      });
      try {
        const res = await call(agent.id, input, {
          onPhase: p => patchRow(id, { phase: p }),
          onSettleHint: taskHash => patchRow(id, { taskHash }),
        });
        patchRow(id, { output: res.output, taskHash: res.taskHash });
        markSettled(id); // 200 = USDC settled on Monad; ws event will attach the explorer link
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
