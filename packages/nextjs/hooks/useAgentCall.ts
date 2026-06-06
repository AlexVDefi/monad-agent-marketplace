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

export interface CallOptions {
  /** Phase transitions, authentic to the x402 flow (402 fires right before the wallet signature). */
  onPhase?: (phase: Phase) => void;
  /** Client-generated taskHash sent to the server, so the row owns it BEFORE the call settles — the
   *  on-chain CallLogged event then always merges into the right row (no duplicate). */
  taskHash?: `0x${string}`;
}

/**
 * The auto-paying client. Builds an x402 signer from the wagmi wallet client and runs the
 * request → 402 → signed → settling lifecycle. Passing a client-generated taskHash lets the feed
 * dedupe the optimistic row against the on-chain confirmation deterministically.
 */
export function useAgentCall() {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (id: string, input: string, opts?: CallOptions): Promise<CallResult> => {
      if (!walletClient || !address) {
        opts?.onPhase?.("error");
        throw new Error("Connect a wallet on Monad testnet first.");
      }

      setBusy(true);
      opts?.onPhase?.("request");

      const signer = {
        address: address as `0x${string}`,
        signTypedData: async (message: any) => {
          opts?.onPhase?.("402"); // 402 received → x402 is asking us to authorize the USDC payment
          const sig = await walletClient.signTypedData({ ...message, account: address });
          opts?.onPhase?.("signed"); // user signed the transferWithAuthorization
          return sig;
        },
      };

      const client = new x402Client().register(X402_NETWORK, new ExactEvmScheme(signer));
      const paidFetch = wrapFetchWithPayment(fetch, client);

      try {
        const res = await paidFetch(`/api/agents/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, taskHash: opts?.taskHash }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`Agent call failed (${res.status}): ${detail.slice(0, 200)}`);
        }
        const data = (await res.json()) as CallResult;
        opts?.onPhase?.("settling"); // paid + work done; the on-chain CallLogged confirm attaches the tx
        return data;
      } catch (e) {
        opts?.onPhase?.("error");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, address],
  );

  return { call, busy, ready: Boolean(walletClient && address) };
}
