import { type NextRequest, NextResponse } from "next/server";
import { orchestrate } from "~~/services/agents/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * L3 — fires the autonomous agent-to-agent swarm. The orchestrator (server wallet) pays N sub-agents
 * via x402; each settlement + CallLogged event streams into the live feed. No human signatures.
 */
export async function POST(req: NextRequest) {
  let task = "Summarize this product update and gauge how users will feel about it.";
  let count = 8;
  try {
    const body = await req.json();
    if (typeof body?.task === "string" && body.task.trim()) task = body.task.trim().slice(0, 500);
    if (Number.isFinite(body?.count)) count = Math.max(1, Math.min(16, Number(body.count)));
  } catch {
    /* defaults */
  }

  const origin = new URL(req.url).origin;
  try {
    const result = await orchestrate(origin, task, count);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "orchestrate failed" }, { status: 500 });
  }
}
