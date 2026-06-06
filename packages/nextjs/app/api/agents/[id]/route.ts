import { type NextRequest, NextResponse } from "next/server";
import { type RouteConfig, setSettlementOverrides, withX402 } from "@x402/next";
import { appendCallLog } from "~~/services/agents/callLog";
import { logCallOnChain, makeTaskHash } from "~~/services/agents/logCall";
import { meteredSettleUsd, usdToMicro } from "~~/services/agents/pricing";
import { getAgent } from "~~/services/agents/registry";
import { runAgent } from "~~/services/agents/run";
import { X402_NETWORK, exactServer, uptoServer } from "~~/services/agents/x402";

export const dynamic = "force-dynamic";
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;

/**
 * ONE dynamic route gates every agent. Order is sacred: x402 VERIFY → run work → settle.
 *
 * - exact agents: buyer pays the fixed price.
 * - upto agents (metered): buyer authorizes maxPriceUsd; after the work runs we measure the real
 *   cost and `setSettlementOverrides` to settle cost×markup (≤ max) — only what was actually used.
 *
 * Client sends a taskHash so its row and the on-chain CallLogged event share one id (no duplicate).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const agent = getAgent(params.id);
  if (!agent) {
    return NextResponse.json({ error: `unknown agent '${params.id}'` }, { status: 404 });
  }

  let input = "";
  let clientTaskHash: `0x${string}` | null = null;
  try {
    const body = await req.clone().json();
    input = String(body?.input ?? "");
    if (typeof body?.taskHash === "string" && BYTES32.test(body.taskHash))
      clientTaskHash = body.taskHash as `0x${string}`;
  } catch {
    input = "";
  }

  const isUpto = agent.scheme === "upto";
  const maxUsd = (agent.maxMicroUsdc ?? agent.priceMicroUsdc) / 1_000_000;
  const server = isUpto ? uptoServer : exactServer;
  const routeConfig: RouteConfig = {
    accepts: {
      scheme: agent.scheme,
      network: X402_NETWORK,
      payTo: process.env.PAY_TO_ADDRESS as string,
      price: isUpto ? (agent.maxPriceUsd ?? agent.priceUsd) : agent.priceUsd,
    },
  };

  const handler = async (): Promise<NextResponse> => {
    const { output, costUsd } = await runAgent(agent, input);

    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const taskHash = clientTaskHash ?? makeTaskHash(agent.agentId, input, nonce);

    // What the buyer actually pays: metered for upto (cost×markup ≤ max), fixed for exact.
    const settledUsd = isUpto ? meteredSettleUsd(costUsd, maxUsd) : agent.priceMicroUsdc / 1_000_000;
    const settledMicro = usdToMicro(settledUsd);

    const res = NextResponse.json({
      agent: agent.id,
      agentId: agent.agentId,
      output,
      scheme: agent.scheme,
      // priceMicroUsdc = what the buyer actually paid (alias kept for existing consumers)
      priceMicroUsdc: settledMicro,
      settledMicroUsdc: settledMicro,
      costMicroUsdc: usdToMicro(costUsd),
      taskHash,
    });

    // Metered settlement: capture only the actual amount (≤ the buyer's authorized max).
    if (isUpto) setSettlementOverrides(res, { amount: `$${settledUsd.toFixed(6)}` });

    // On-chain heartbeat records the ACTUAL settled amount.
    void logCallOnChain(agent.agentId, settledMicro, taskHash).catch((err: unknown) =>
      console.error("[logCall] failed:", err instanceof Error ? err.message : err),
    );
    // Observability sink: prompt + output + cost vs charged + margin.
    void appendCallLog({
      agent: agent.id,
      agentId: agent.agentId,
      agentName: agent.name,
      prompt: input,
      output,
      scheme: agent.scheme,
      costUsd,
      settledUsd,
      taskHash,
    });

    return res;
  };

  return withX402(handler, routeConfig, server)(req);
}
