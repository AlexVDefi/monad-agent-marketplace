"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { AGENT_BAZAAR_ADDRESS, agentBazaarAbi } from "~~/contracts/agentBazaarAbi";
import { useScaffoldWatchContractEvent, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { AGENTS } from "~~/services/agents/registry";

export interface AgentStat {
  upvotes: number;
  calls: number;
}

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * On-chain agent stats (upvotes + call counts), the authoritative source for the leaderboard.
 * Seeded from chain on mount so a refresh restores real reputation (no more reset), then kept live
 * via the Rated / CallLogged events and an optimistic bump on rate(). Reads via the public client
 * (one batch on mount) — NOT a per-block watched read, so it stays off the payment tick.
 */
export function useAgentStats() {
  const publicClient = usePublicClient();
  const [stats, setStats] = useState<Record<number, AgentStat>>({});
  const { writeContractAsync } = useScaffoldWriteContract("AgentBazaar");

  // Seed upvotes + calls from chain once the client is ready (authoritative, cross-device).
  useEffect(() => {
    if (!publicClient || !AGENT_BAZAAR_ADDRESS || AGENT_BAZAAR_ADDRESS.toLowerCase() === ZERO) return;
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          AGENTS.map(async a => {
            const [up, calls] = await Promise.all([
              publicClient.readContract({
                address: AGENT_BAZAAR_ADDRESS,
                abi: agentBazaarAbi,
                functionName: "upvotes",
                args: [BigInt(a.agentId)],
              }),
              publicClient.readContract({
                address: AGENT_BAZAAR_ADDRESS,
                abi: agentBazaarAbi,
                functionName: "callCount",
                args: [BigInt(a.agentId)],
              }),
            ]);
            return [a.agentId, { upvotes: Number(up), calls: Number(calls) }] as const;
          }),
        );
        if (cancelled) return;
        setStats(prev => {
          const next = { ...prev };
          for (const [id, s] of entries) {
            next[id] = {
              upvotes: Math.max(prev[id]?.upvotes ?? 0, s.upvotes),
              calls: Math.max(prev[id]?.calls ?? 0, s.calls),
            };
          }
          return next;
        });
      } catch {
        /* leave whatever live events have accumulated */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  // Live: each paid call bumps that agent's call count.
  useScaffoldWatchContractEvent({
    contractName: "AgentBazaar",
    eventName: "CallLogged",
    onLogs: logs =>
      logs.forEach(log => {
        const id = Number((log.args as { agentId?: bigint }).agentId ?? 0);
        if (!id) return;
        setStats(prev => ({ ...prev, [id]: { upvotes: prev[id]?.upvotes ?? 0, calls: (prev[id]?.calls ?? 0) + 1 } }));
      }),
  });

  // Live: ratings reconcile to the on-chain count.
  useScaffoldWatchContractEvent({
    contractName: "AgentBazaar",
    eventName: "Rated",
    onLogs: logs =>
      logs.forEach(log => {
        const args = log.args as { agentId?: bigint; newUpvotes?: bigint };
        const id = Number(args.agentId ?? 0);
        if (!id) return;
        const n = Number(args.newUpvotes ?? 0);
        setStats(prev => ({
          ...prev,
          [id]: { calls: prev[id]?.calls ?? 0, upvotes: Math.max(prev[id]?.upvotes ?? 0, n) },
        }));
      }),
  });

  const rate = useCallback(
    async (agentId: number) => {
      setStats(prev => ({
        ...prev,
        [agentId]: { calls: prev[agentId]?.calls ?? 0, upvotes: (prev[agentId]?.upvotes ?? 0) + 1 },
      }));
      try {
        await writeContractAsync({ functionName: "rate", args: [BigInt(agentId)] });
      } catch (e) {
        setStats(prev => ({
          ...prev,
          [agentId]: { calls: prev[agentId]?.calls ?? 0, upvotes: Math.max(0, (prev[agentId]?.upvotes ?? 1) - 1) },
        }));
        throw e;
      }
    },
    [writeContractAsync],
  );

  return { stats, rate };
}
