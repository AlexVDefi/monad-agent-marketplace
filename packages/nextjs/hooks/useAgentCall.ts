"use client";

import { useCallback, useState } from "react";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { UptoEvmScheme, createPermit2ApprovalTx, getPermit2AllowanceReadParams } from "@x402/evm/upto/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

const X402_NETWORK = "eip155:10143";
const USDC = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x534b2f3A21130d7a60830c2Df862319e593943A3") as `0x${string}`;

export type Phase = "idle" | "request" | "402" | "signed" | "settling" | "settled" | "error";

export interface CallResult {
  agent: string;
  agentId: number;
  output: string;
  scheme: "exact" | "upto";
  /** What the buyer actually paid (metered for upto, fixed for exact), in USDC micro-units. */
  priceMicroUsdc: number;
  /** Alias of priceMicroUsdc — what was actually settled on-chain. */
  settledMicroUsdc: number;
  /** Real cost incurred to produce the output (LLM tokens; 0 for deterministic). */
  costMicroUsdc: number;
  taskHash: `0x${string}`;
  /** The CallLogged heartbeat tx hash, for the explorer link. null if the on-chain write timed out. */
  txHash?: `0x${string}` | null;
}

export interface CallOptions {
  onPhase?: (phase: Phase) => void;
  taskHash?: `0x${string}`;
  scheme: "exact" | "upto";
  /** upto: the authorized max, used to decide whether a Permit2 approval is needed. */
  maxMicroUsdc?: number;
}

/**
 * The auto-paying client. Builds the x402 signer from the wagmi wallet client and, per agent, the
 * matching scheme: ExactEvmScheme (fixed price) or UptoEvmScheme (metered, Permit2). For metered
 * agents it ensures the one-time USDC→Permit2 approval before paying.
 */
export function useAgentCall() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (id: string, input: string, opts: CallOptions): Promise<CallResult> => {
      if (!walletClient || !address || !publicClient) {
        opts.onPhase?.("error");
        throw new Error("Connect a wallet on Monad testnet first.");
      }

      setBusy(true);
      opts.onPhase?.("request");

      const signer = {
        address: address as `0x${string}`,
        signTypedData: async (message: any) => {
          opts.onPhase?.("402"); // 402 → x402 is asking us to authorize the USDC payment
          const sig = await walletClient.signTypedData({ ...message, account: address });
          opts.onPhase?.("signed");
          return sig;
        },
      };

      try {
        // Metered (upto) uses Permit2 — ensure the one-time USDC→Permit2 approval exists.
        if (opts.scheme === "upto") {
          const readParams = getPermit2AllowanceReadParams({
            tokenAddress: USDC,
            ownerAddress: address as `0x${string}`,
          });
          const allowance = (await publicClient.readContract(readParams as any)) as bigint;
          const needed = BigInt(opts.maxMicroUsdc ?? 10000);
          if (allowance < needed) {
            const tx = createPermit2ApprovalTx(USDC);
            const hash = await walletClient.sendTransaction({ account: address, to: tx.to, data: tx.data });
            await publicClient.waitForTransactionReceipt({ hash });
          }
        }

        const scheme = opts.scheme === "upto" ? new UptoEvmScheme(signer) : new ExactEvmScheme(signer);
        const client = new x402Client().register(X402_NETWORK, scheme);
        const paidFetch = wrapFetchWithPayment(fetch, client);

        const res = await paidFetch(`/api/agents/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, taskHash: opts.taskHash }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`Agent call failed (${res.status}): ${detail.slice(0, 200)}`);
        }
        const data = (await res.json()) as CallResult;
        opts.onPhase?.("settling");
        return data;
      } catch (e) {
        opts.onPhase?.("error");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, publicClient, address],
  );

  return { call, busy, ready: Boolean(walletClient && address) };
}
