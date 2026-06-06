import { createWalletClient, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { AGENT_BAZAAR_ADDRESS, agentBazaarAbi } from "~~/contracts/agentBazaarAbi";
import { monadTestnet } from "~~/utils/customChains";

/**
 * SERVER-ONLY. Fires the AgentBazaar.logCall heartbeat after a paid call so the UI's websocket
 * subscription receives a context-rich CallLogged event (USDC Transfer logs lack task context and
 * may be facilitator-batched). Signs with SERVER_SIGNER_PRIVATE_KEY (the funded server wallet).
 */
const ZERO = "0x0000000000000000000000000000000000000000";

// Build a fully-typed wallet client (chain + account bound) on each use. Cheap; keeps viem's
// writeContract types precise so `chain`/`account` stay optional.
function getWallet() {
  const pk = process.env.SERVER_SIGNER_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({ account, chain: monadTestnet, transport: http("https://testnet-rpc.monad.xyz") });
}

/** Deterministic-ish task id tying the on-chain event to this exact call (matched by the UI feed). */
export function makeTaskHash(agentId: number, input: string, nonce: string): `0x${string}` {
  return keccak256(toBytes(`${agentId}:${nonce}:${input.slice(0, 256)}`));
}

/**
 * Sends logCall and returns the tx hash WITHOUT awaiting confirmation (the ws CallLogged event is
 * what flips the UI row's explorer link). No-ops safely if the contract isn't deployed or no signer.
 */
export async function logCallOnChain(
  agentId: number,
  priceMicroUsdc: number,
  taskHash: `0x${string}`,
): Promise<`0x${string}` | null> {
  if (!AGENT_BAZAAR_ADDRESS || AGENT_BAZAAR_ADDRESS.toLowerCase() === ZERO) return null;
  const wallet = getWallet();
  if (!wallet) return null;
  return wallet.writeContract({
    address: AGENT_BAZAAR_ADDRESS,
    abi: agentBazaarAbi,
    functionName: "logCall",
    args: [BigInt(agentId), BigInt(priceMicroUsdc), taskHash],
    chain: monadTestnet,
    gas: 200_000n, // sane upfront cap — covers the cold-storage first call; Monad bills gas_limit
  });
}
