import { type NextRequest, NextResponse } from "next/server";
import { type RouteConfig, withX402 } from "@x402/next";
import { logCallOnChain, makeTaskHash } from "~~/services/agents/logCall";
import { getAgent } from "~~/services/agents/registry";
import { runAgent } from "~~/services/agents/run";
import { X402_NETWORK, x402Server } from "~~/services/agents/x402";

export const dynamic = "force-dynamic";

const BYTES32 = /^0x[0-9a-fA-F]{64}$/;

/**
 * ONE dynamic route gates every agent. Order is sacred: x402 VERIFY → run work → (settle).
 * withX402 verifies the payment before it ever calls our handler, so we never compute (or spend
 * Anthropic budget) before the buyer has paid. POST so the task input rides in the body.
 *
 * The client sends a taskHash so its optimistic row and the on-chain CallLogged event share one id
 * (no duplicate rows). The swarm orchestrator omits it → we compute one server-side.
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
    if (typeof body?.taskHash === "string" && BYTES32.test(body.taskHash)) {
      clientTaskHash = body.taskHash as `0x${string}`;
    }
  } catch {
    input = "";
  }

  const routeConfig: RouteConfig = {
    accepts: {
      scheme: "exact",
      network: X402_NETWORK,
      payTo: process.env.PAY_TO_ADDRESS as string,
      price: agent.priceUsd,
    },
  };

  // Runs ONLY after x402 verification succeeds.
  const handler = async (): Promise<NextResponse> => {
    const output = await runAgent(agent, input);

    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const taskHash = clientTaskHash ?? makeTaskHash(agent.agentId, input, nonce);

    // Heartbeat: fire-and-forget so we don't block the 200. The ws CallLogged event drives the
    // on-chain confirmation (explorer link) in the UI.
    void logCallOnChain(agent.agentId, agent.priceMicroUsdc, taskHash).catch((err: unknown) =>
      console.error("[logCall] failed:", err instanceof Error ? err.message : err),
    );

    return NextResponse.json({
      agent: agent.id,
      agentId: agent.agentId,
      output,
      priceMicroUsdc: agent.priceMicroUsdc,
      taskHash,
    });
  };

  return withX402(handler, routeConfig, x402Server)(req);
}
