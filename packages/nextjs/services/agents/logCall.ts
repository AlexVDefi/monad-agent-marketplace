import { createWalletClient, http, keccak256, nonceManager, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { AGENT_BAZAAR_ADDRESS, agentBazaarAbi } from "~~/contracts/agentBazaarAbi";
import { monadTestnet } from "~~/utils/customChains";

/**
 * SERVER-ONLY. Fires the AgentBazaar.logCall heartbeat after a paid call so the UI's websocket
 * subscription receives a context-rich CallLogged event. Signs with SERVER_SIGNER_PRIVATE_KEY.
 */
const ZERO = "0x0000000000000000000000000000000000000000";

// Singleton wallet with viem's nonceManager. CRITICAL on Monad: the RPC "pending" nonce lags a
// just-sent tx, so naive sends (even serialized) reuse the same nonce and revert — which is exactly
// why an agent-swarm burst dropped logCall heartbeats. nonceManager tracks the nonce locally and
// hands out sequential values, so concurrent/rapid sends each get a fresh nonce.
function buildWallet() {
  const pk = process.env.SERVER_SIGNER_PRIVATE_KEY;
  if (!pk) {
    console.warn(
      "[logCall] SERVER_SIGNER_PRIVATE_KEY is not set — on-chain heartbeats are DISABLED, so stream " +
        "rows show 'settled' with no explorer link. Set it in the Vercel project env vars and redeploy.",
    );
    return null;
  }
  const account = privateKeyToAccount(pk as `0x${string}`, { nonceManager });
  return createWalletClient({ account, chain: monadTestnet, transport: http("https://testnet-rpc.monad.xyz") });
}

let warnedNoAddress = false;

let cachedWallet: ReturnType<typeof buildWallet> = null;
let initialized = false;
function getWallet() {
  if (!initialized) {
    cachedWallet = buildWallet();
    initialized = true;
  }
  return cachedWallet;
}

/** Deterministic-ish task id tying the on-chain event to this exact call (matched by the UI feed). */
export function makeTaskHash(agentId: number, input: string, nonce: string): `0x${string}` {
  return keccak256(toBytes(`${agentId}:${nonce}:${input.slice(0, 256)}`));
}

// Serialize sends so a burst spreads its RPC load over time (avoids rate-limit hiccups) on top of
// nonceManager handling the nonce assignment.
let sendQueue: Promise<unknown> = Promise.resolve();

/**
 * Sends logCall and returns the tx hash WITHOUT awaiting confirmation. One retry on transient
 * failure. No-ops safely if the contract isn't deployed or no signer is configured.
 */
export async function logCallOnChain(
  agentId: number,
  priceMicroUsdc: number,
  taskHash: `0x${string}`,
): Promise<`0x${string}` | null> {
  if (!AGENT_BAZAAR_ADDRESS || AGENT_BAZAAR_ADDRESS.toLowerCase() === ZERO) {
    if (!warnedNoAddress) {
      warnedNoAddress = true;
      console.warn(
        "[logCall] NEXT_PUBLIC_AGENT_BAZAAR_ADDRESS is unset/zero — heartbeats disabled (no explorer " +
          "link). This is a BUILD-time var: set it in Vercel, then trigger a fresh deploy.",
      );
    }
    return null;
  }
  const wallet = getWallet();
  if (!wallet) return null;

  const attempt = () =>
    wallet.writeContract({
      address: AGENT_BAZAAR_ADDRESS,
      abi: agentBazaarAbi,
      functionName: "logCall",
      args: [BigInt(agentId), BigInt(priceMicroUsdc), taskHash],
      chain: monadTestnet,
      gas: 200_000n,
    });

  const send = sendQueue.then(async () => {
    try {
      return await attempt();
    } catch {
      return await attempt(); // one retry — nonceManager re-syncs and the RPC hiccup usually clears
    }
  });
  sendQueue = send.then(
    () => undefined,
    () => undefined,
  );
  return send;
}

/**
 * Sends logTip — the on-chain reputation log for a viewer tip, AFTER its USDC transfer was verified
 * server-side (see /api/tip). Same singleton wallet + nonceManager + send-queue as logCall, so tip
 * heartbeats serialize safely alongside call heartbeats. `ref` is the USDC transfer tx hash.
 */
export async function logTipOnChain(
  agentId: number,
  tipper: `0x${string}`,
  amountMicroUsdc: number,
  ref: `0x${string}`,
): Promise<`0x${string}` | null> {
  if (!AGENT_BAZAAR_ADDRESS || AGENT_BAZAAR_ADDRESS.toLowerCase() === ZERO) return null;
  const wallet = getWallet();
  if (!wallet) return null;

  const attempt = () =>
    wallet.writeContract({
      address: AGENT_BAZAAR_ADDRESS,
      abi: agentBazaarAbi,
      functionName: "logTip",
      args: [BigInt(agentId), tipper, BigInt(amountMicroUsdc), ref],
      chain: monadTestnet,
      gas: 200_000n,
    });

  const send = sendQueue.then(async () => {
    try {
      return await attempt();
    } catch {
      return await attempt();
    }
  });
  sendQueue = send.then(
    () => undefined,
    () => undefined,
  );
  return send;
}
