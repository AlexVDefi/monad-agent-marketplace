import { type NextRequest, NextResponse } from "next/server";
import { createPublicClient, decodeEventLog, getAddress, http } from "viem";
import { logTipOnChain } from "~~/services/agents/logCall";
import { AGENTS } from "~~/services/agents/registry";
import { monadTestnet } from "~~/utils/customChains";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Records a viewer tip on-chain. The buyer already sent the USDC transfer client-side; here we VERIFY
 * that transfer actually landed (correct token, to the tip wallet) and then emit AgentBazaar.logTip
 * with the server signer — exactly the off-chain-money / on-chain-log split that logCall already uses.
 *
 * The tip amount + tipper are read from the verified on-chain Transfer log (authoritative), so a
 * client can't inflate a tip or credit a transfer it didn't make. `agentId` (which agent earns the
 * reputation) is client-supplied but validated against the registry.
 */
const USDC = getAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x534b2f3A21130d7a60830c2Df862319e593943A3");
const TIP_TO = getAddress(
  process.env.NEXT_PUBLIC_TIP_ADDRESS || process.env.PAY_TO_ADDRESS || "0xdABF85FC4319367C53Ab09a08A6EdC0f615F96AF",
);
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

// Dedup processed transfers so the same tx can't be logged twice (in-memory; fine for the demo).
const processed = new Set<string>();

const publicClient = createPublicClient({ chain: monadTestnet, transport: http("https://testnet-rpc.monad.xyz") });

export async function POST(req: NextRequest) {
  let agentId = 0;
  let txHash = "";
  try {
    const body = await req.json();
    agentId = Number(body?.agentId);
    txHash = String(body?.txHash ?? "");
  } catch {
    return NextResponse.json({ error: "bad request body" }, { status: 400 });
  }

  if (!TX_HASH.test(txHash)) return NextResponse.json({ error: "invalid txHash" }, { status: 400 });
  if (!AGENTS.some(a => a.agentId === agentId)) {
    return NextResponse.json({ error: `unknown agentId ${agentId}` }, { status: 400 });
  }

  const key = txHash.toLowerCase();
  if (processed.has(key)) return NextResponse.json({ ok: true, deduped: true });

  // 1) The transfer must have actually settled.
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return NextResponse.json({ error: "transfer not found yet" }, { status: 400 });
  }
  if (receipt.status !== "success") {
    return NextResponse.json({ error: "transfer did not succeed" }, { status: 400 });
  }

  // 2) Find the USDC Transfer → tip wallet in that tx, and read the authoritative amount + sender.
  let amountMicroUsdc = 0n;
  let tipper: `0x${string}` | null = null;
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== USDC) continue;
    try {
      const decoded = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
      if (decoded.eventName !== "Transfer") continue;
      const { from, to, value } = decoded.args as { from: `0x${string}`; to: `0x${string}`; value: bigint };
      if (getAddress(to) === TIP_TO && value > 0n) {
        amountMicroUsdc = value;
        tipper = getAddress(from) as `0x${string}`;
        break;
      }
    } catch {
      /* not a Transfer log — skip */
    }
  }

  if (!tipper || amountMicroUsdc === 0n) {
    return NextResponse.json({ error: "no USDC tip transfer to the tip wallet in this tx" }, { status: 400 });
  }

  // 3) Mark processed BEFORE emitting so a concurrent retry can't double-log, then write the event.
  processed.add(key);
  try {
    const logTxHash = await logTipOnChain(agentId, tipper, Number(amountMicroUsdc), txHash as `0x${string}`);
    return NextResponse.json({
      ok: true,
      agentId,
      tipper,
      amountMicroUsdc: Number(amountMicroUsdc),
      ref: txHash,
      logTxHash,
    });
  } catch (e) {
    processed.delete(key); // allow a retry — the log didn't go out
    return NextResponse.json({ error: e instanceof Error ? e.message : "logTip failed" }, { status: 500 });
  }
}
