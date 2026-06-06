import { runLLM } from "./llm";
import { AGENTS } from "./registry";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "~~/utils/customChains";

/**
 * L3 — agent-to-agent orchestration. A server-side autonomous orchestrator acts as an x402 CLIENT
 * (the ORCHESTRATOR wallet) and pays the Bazaar's sub-agents per call. No human, no MetaMask popups:
 * one button → a burst of REAL on-chain settlements rattling across the live feed.
 *
 * The orchestrator wallet MUST differ from PAY_TO (you can't pay yourself) and hold testnet USDC.
 */
type Call = { agent: string; input: string };

function getPaidFetch() {
  const pk = process.env.ORCHESTRATOR_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(pk as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http("https://testnet-rpc.monad.xyz"),
  });
  const signer = {
    address: account.address as `0x${string}`,
    signTypedData: (m: any) => walletClient.signTypedData({ ...m, account }),
  };
  const client = new x402Client().register("eip155:10143", new ExactEvmScheme(signer));
  return wrapFetchWithPayment(fetch, client);
}

// The swarm wallet (0xc16B) pays via the EXACT scheme (no Permit2/MON), so it only hires exact
// agents. (Funding it ~0.5 MON would let it do upto/metered agents too — a future upgrade.)
const SWARM_AGENTS = AGENTS.filter(a => a.scheme === "exact");

function fallbackPlan(task: string, count: number): Call[] {
  const pool = SWARM_AGENTS.length ? SWARM_AGENTS : AGENTS;
  return Array.from({ length: count }, (_, i) => {
    const a = pool[i % pool.length];
    return { agent: a.id, input: `${task} — subtask ${i + 1}` };
  });
}

/** Ask Haiku which sub-agents to hire (LLM-led), with a hard timeout → deterministic fallback. */
async function planCalls(task: string, count: number): Promise<Call[]> {
  const fb = fallbackPlan(task, count);
  const llm = (async (): Promise<Call[]> => {
    const sys = `You are an autonomous orchestrator that hires sub-agents and pays each per call. Available agents: ${SWARM_AGENTS.map(
      a => `"${a.id}" (${a.blurb})`,
    ).join(
      ", ",
    )}. Return ONLY a JSON array (no prose) of 3-5 calls, each {"agent":<id>,"input":<short text>}, choosing agents that help accomplish the task.`;
    const { text: out } = await runLLM(`Task: ${task}`, sys);
    const arr = JSON.parse(out.slice(out.indexOf("["), out.lastIndexOf("]") + 1)) as Call[];
    const valid = arr.filter(c => SWARM_AGENTS.some(a => a.id === c.agent) && typeof c.input === "string");
    if (!valid.length) return fb;
    // cycle the chosen calls up to `count` for a visible flood
    return Array.from({ length: count }, (_, i) => valid[i % valid.length]);
  })();
  const timeout = new Promise<Call[]>(resolve => setTimeout(() => resolve(fb), 3000));
  try {
    return await Promise.race([llm, timeout]);
  } catch {
    return fb;
  }
}

export async function orchestrate(baseUrl: string, task: string, count = 8) {
  const paidFetch = getPaidFetch();
  if (!paidFetch) throw new Error("ORCHESTRATOR_PRIVATE_KEY not set — fund the orchestrator wallet and set its key.");

  const plan = await planCalls(task, count);

  // Fire concurrently: the x402 payer signs each authorization independently (random EIP-3009
  // nonces, gasless via the facilitator), so there is no payer-nonce contention. The on-chain
  // logCall heartbeats serialize safely via the send-mutex in logCall.ts.
  const settled = await Promise.allSettled(
    plan.map(async c => {
      const res = await paidFetch(`${baseUrl}/api/agents/${c.agent}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: c.input }),
      });
      return { agent: c.agent, status: res.status };
    }),
  );

  const ok = settled.filter(s => s.status === "fulfilled" && (s.value as { status: number }).status === 200).length;
  return {
    task,
    planned: plan.length,
    settled: ok,
    results: settled.map(s =>
      s.status === "fulfilled" ? s.value : { error: String((s as PromiseRejectedResult).reason).slice(0, 120) },
    ),
  };
}
