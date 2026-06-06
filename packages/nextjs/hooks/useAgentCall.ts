"use client";

import { useCallback, useState } from "react";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment } from "@x402/fetch";
import { useAccount, useWalletClient } from "wagmi";

const X402_NETWORK = "eip155:10143";

/** Lifecycle of a single paid call, surfaced to the UI as phase pills. */
export type Phase = "idle" | "request" | "402" | "signed" | "settling" | "settled" | "error";

export interface CallResult {
  agent: string;
  agentId: number;
  output: string;
  priceMicroUsdc: number;
  taskHash: `0x${string}`;
}

export interface CallCallbacks {
  /** Phase transitions, authentic to the x402 flow (402 fires right before the wallet signature). */
  onPhase?: (phase: Phase) => void;
  /** The taskHash to watch for on-chain — the feed flips the row to "settled" when CallLogged matches. */
  onSettleHint?: (taskHash: `0x${string}`) => void;
}

/**
 * The auto-paying client + orchestrator. Builds an x402 signer from the wagmi wallet client and runs
 * the request → 402 → signed → settling lifecycle. The final "settled" transition is owned by the
 * PaymentStream's websocket subscription (matching taskHash), not by this hook.
 */
export function useAgentCall() {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (id: string, input: string, cb?: CallCallbacks): Promise<CallResult> => {
      if (!walletClient || !address) {
        cb?.onPhase?.("error");
        throw new Error("Connect a wallet on Monad testnet first.");
      }

      setBusy(true);
      cb?.onPhase?.("request");

      // Plain structural signer — bridges x402's EIP-712 request to the wagmi wallet client. This is
      // why x402's nested viem (2.52.2) and the app's viem (2.21.32) don't need to match.
      const signer = {
        address: address as `0x${string}`,
        signTypedData: async (message: any) => {
          cb?.onPhase?.("402"); // 402 received → x402 is asking us to authorize the USDC payment
          const sig = await walletClient.signTypedData({ ...message, account: address });
          cb?.onPhase?.("signed"); // user signed the transferWithAuthorization
          return sig;
        },
      };

      const client = new x402Client().register(X402_NETWORK, new ExactEvmScheme(signer));
      const paidFetch = wrapFetchWithPayment(fetch, client);

      try {
        const res = await paidFetch(`/api/agents/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`Agent call failed (${res.status}): ${detail.slice(0, 200)}`);
        }
        const data = (await res.json()) as CallResult;
        cb?.onPhase?.("settling"); // paid + work done; awaiting the on-chain CallLogged confirm
        cb?.onSettleHint?.(data.taskHash);
        return data;
      } catch (e) {
        cb?.onPhase?.("error");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, address],
  );

  return { call, busy, ready: Boolean(walletClient && address) };
}
