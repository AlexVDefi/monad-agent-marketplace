"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useFeedStore } from "~~/components/agents/feedStore";
import type { AgentMeta } from "~~/services/agents/registry";
import { monadTestnet } from "~~/utils/customChains";

/**
 * Viewer tips — a plain USDC `transfer` from the connected wallet to the tip wallet (defaults to the
 * agent earnings address, PAY_TO). NOT x402 and NOT a contract call: a tip is a gift, so it's the
 * simplest possible path — one signature, no Permit2, no metering. On confirmation the tip streams
 * into the live feed (addTip) so it lands in the same on-chain economy the payments live in.
 *
 * USDC is 6-decimals, so the registry's micro-USDC units ARE the token base units — no parseUnits.
 */
const USDC = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x534b2f3A21130d7a60830c2Df862319e593943A3") as `0x${string}`;
const TIP_TO = (process.env.NEXT_PUBLIC_TIP_ADDRESS || "0xdABF85FC4319367C53Ab09a08A6EdC0f615F96AF") as `0x${string}`;

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type TipPhase = "idle" | "signing" | "pending" | "confirmed" | "error";

export interface TipState {
  phase: TipPhase;
  txHash?: `0x${string}`;
  error?: string;
  /** What was tipped, in USDC micro-units, kept for the confirmed receipt. */
  microUsdc?: number;
}

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.monadexplorer.com";

export function useTipAgent() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, chainId } = useAccount();
  const addTip = useFeedStore(s => s.addTip);
  const [state, setState] = useState<TipState>({ phase: "idle" });

  const ready = Boolean(walletClient && address && publicClient);
  const reset = useCallback(() => setState({ phase: "idle" }), []);

  const tip = useCallback(
    async (agent: AgentMeta, microUsdc: number) => {
      if (!walletClient || !address || !publicClient) {
        setState({ phase: "error", error: "Connect a wallet on Monad testnet first." });
        return;
      }
      if (!Number.isFinite(microUsdc) || microUsdc <= 0) {
        setState({ phase: "error", error: "Enter a tip amount greater than zero." });
        return;
      }
      if (chainId && chainId !== monadTestnet.id) {
        setState({ phase: "error", error: "Switch your wallet to Monad testnet to tip." });
        return;
      }

      setState({ phase: "signing", microUsdc });
      try {
        const hash = await walletClient.writeContract({
          address: USDC,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [TIP_TO, BigInt(Math.round(microUsdc))],
          account: address as `0x${string}`,
          chain: monadTestnet,
        });
        setState({ phase: "pending", txHash: hash, microUsdc });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          setState({ phase: "error", txHash: hash, microUsdc, error: "Transfer reverted on-chain." });
          return;
        }

        addTip({ agentId: agent.agentId, agentName: agent.name, glyph: agent.glyph, microUsdc, txHash: hash });
        setState({ phase: "confirmed", txHash: hash, microUsdc });

        // Best-effort: ask the server to record the on-chain Tipped event (cross-device reputation).
        // The money already moved, so a failure here doesn't undo the tip — it just skips the log.
        void fetch("/api/tip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agent.agentId, txHash: hash }),
        }).catch(() => {
          /* tip still succeeded; the reputation log is non-critical */
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Tip failed.";
        // Trim noisy provider stacks to the first meaningful line.
        setState({ phase: "error", error: msg.split("\n")[0].slice(0, 160) });
      }
    },
    [walletClient, address, publicClient, chainId, addTip],
  );

  return { tip, reset, state, ready, explorerBase: EXPLORER, tipTo: TIP_TO };
}
