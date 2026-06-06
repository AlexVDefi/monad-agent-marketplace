"use client";

import { useFeedStore } from "./feedStore";
import { useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";
import { AGENTS } from "~~/services/agents/registry";

/**
 * The on-chain half of the belt-and-suspenders feed. Subscribes to AgentBazaar.CallLogged over the
 * websocket transport (configured in wagmiConfig). Each event either (a) attaches the explorer tx to
 * a matching client row, or (b) adds a settled row for a call made elsewhere (a Blink / another
 * wallet / the agent-to-agent orchestrator). Never polls long-range eth_getLogs (Monad caveat).
 */
export function useCallLoggedFeed() {
  const confirmFromChain = useFeedStore(s => s.confirmFromChain);

  useScaffoldWatchContractEvent({
    contractName: "AgentBazaar",
    eventName: "CallLogged",
    onLogs: logs => {
      logs.forEach(log => {
        const args = log.args as {
          agentId?: bigint;
          priceMicroUsdc?: bigint;
          taskHash?: string;
        };
        if (args.taskHash == null || args.agentId == null) return;
        const agentId = Number(args.agentId);
        const meta = AGENTS.find(a => a.agentId === agentId);
        confirmFromChain({
          taskHash: String(args.taskHash),
          txHash: log.transactionHash as `0x${string}`,
          agentId,
          priceMicroUsdc: Number(args.priceMicroUsdc ?? 0n),
          agentName: meta?.name,
          glyph: meta?.glyph,
        });
      });
    },
  });
}
