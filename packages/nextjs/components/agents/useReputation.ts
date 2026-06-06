"use client";

import { useCallback, useState } from "react";
import { useScaffoldWatchContractEvent, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/**
 * On-chain 👍 reputation backed by AgentBazaar.rate() + the Rated event. Optimistic bump on click for
 * snappy UX; the Rated ws event reconciles (and surfaces ratings from other wallets). Event-driven,
 * NOT a watched read — so the leaderboard stays off the per-block tick (design-brief throttle rule).
 *
 * (This is our own on-chain reputation primitive; it maps onto the ERC-8004 reputation model, which
 * is the portable cross-app trust standard deployed on Monad.)
 */
export function useReputation() {
  const [upvotes, setUpvotes] = useState<Record<number, number>>({});
  const { writeContractAsync, isMining } = useScaffoldWriteContract("AgentBazaar");

  useScaffoldWatchContractEvent({
    contractName: "AgentBazaar",
    eventName: "Rated",
    onLogs: logs =>
      logs.forEach(log => {
        const args = log.args as { agentId?: bigint; newUpvotes?: bigint };
        if (args.agentId == null || args.newUpvotes == null) return;
        const id = Number(args.agentId);
        const n = Number(args.newUpvotes);
        setUpvotes(prev => ({ ...prev, [id]: Math.max(prev[id] ?? 0, n) }));
      }),
  });

  const rate = useCallback(
    async (agentId: number) => {
      setUpvotes(prev => ({ ...prev, [agentId]: (prev[agentId] ?? 0) + 1 })); // optimistic
      try {
        await writeContractAsync({ functionName: "rate", args: [BigInt(agentId)] });
      } catch (e) {
        setUpvotes(prev => ({ ...prev, [agentId]: Math.max(0, (prev[agentId] ?? 1) - 1) })); // revert
        throw e;
      }
    },
    [writeContractAsync],
  );

  return { upvotes, rate, isMining };
}
