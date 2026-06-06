import { runLLM } from "./llm";
import { AGENTS, getAgent } from "./registry";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { UptoEvmScheme, createPermit2ApprovalTx, getPermit2AllowanceReadParams } from "@x402/evm/upto/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createPublicClient, createWalletClient, http } from "viem";
import { nonceManager, privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "~~/utils/customChains";

/**
 * L3 — agent-to-agent orchestration. A server-side autonomous orchestrator acts as an x402 CLIENT
 * (the ORCHESTRATOR wallet) and pays the Bazaar's sub-agents per call. No human, no MetaMask popups:
 * one button → a burst of REAL on-chain settlements rattling across the live feed.
 *
 * The orchestrator wallet MUST differ from PAY_TO (you can't pay yourself) and hold testnet USDC.
 * It now hires BOTH schemes:
 *  - exact agents: pure EIP-3009 authorization, gasless.
 *  - upto agents (metered): UptoEvmScheme over Permit2 — needs a ONE-TIME on-chain USDC→Permit2
 *    approval (costs a little MON for gas; per-call settlements are still gasless thereafter).
 */
type Call = { agent: string; input: string };

const X402_NETWORK = "eip155:10143";
const RPC = "https://testnet-rpc.monad.xyz";
const USDC = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x534b2f3A21130d7a60830c2Df862319e593943A3") as `0x${string}`;

/** Build the orchestrator's wallet/public clients + x402 signer once per run. */
function getOrchestrator() {
  const pk = process.env.ORCHESTRATOR_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(pk as `0x${string}`, { nonceManager });
  const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http(RPC) });
  const publicClient = createPublicClient({ chain: monadTestnet, transport: http(RPC) });
  const signer = {
    address: account.address as `0x${string}`,
    signTypedData: (m: any) => walletClient.signTypedData({ ...m, account }),
  };
  return { account, walletClient, publicClient, signer };
}

type Orchestrator = NonNullable<ReturnType<typeof getOrchestrator>>;

/** A paying fetch bound to the scheme a given agent demands (exact vs. metered/upto). */
function paidFetchFor(scheme: "exact" | "upto", signer: Orchestrator["signer"]) {
  const s = scheme === "upto" ? new UptoEvmScheme(signer) : new ExactEvmScheme(signer);
  const client = new x402Client().register(X402_NETWORK, s);
  return wrapFetchWithPayment(fetch, client);
}

/**
 * Metered agents pull funds via Permit2, which first needs a one-time USDC→Permit2 approval from the
 * orchestrator wallet. Mirrors the client flow in useAgentCall.ts: read the standing allowance and
 * only send the approval tx (the part that spends MON gas) if it's short. Idempotent across runs.
 */
async function ensurePermit2Approval(orch: Orchestrator, neededMicro: number) {
  const readParams = getPermit2AllowanceReadParams({
    tokenAddress: USDC,
    ownerAddress: orch.account.address as `0x${string}`,
  });
  const allowance = (await orch.publicClient.readContract(readParams as any)) as bigint;
  if (allowance >= BigInt(neededMicro)) return;
  const tx = createPermit2ApprovalTx(USDC);
  const hash = await orch.walletClient.sendTransaction({
    account: orch.account,
    to: tx.to,
    data: tx.data,
    chain: monadTestnet,
  });
  await orch.publicClient.waitForTransactionReceipt({ hash });
}

// The swarm now hires every registered agent — exact AND metered. The planner is free to mix them.
const SWARM_AGENTS = AGENTS;

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
  const orch = getOrchestrator();
  if (!orch) throw new Error("ORCHESTRATOR_PRIVATE_KEY not set — fund the orchestrator wallet and set its key.");

  const plan = await planCalls(task, count);

  // If the plan hires any metered agent, make sure the one-time Permit2 approval exists first (the
  // only step that spends MON). Authorize for the largest ceiling any planned upto agent demands.
  const uptoMax = plan
    .map(c => getAgent(c.agent))
    .filter((a): a is NonNullable<typeof a> => a?.scheme === "upto")
    .reduce((m, a) => Math.max(m, a.maxMicroUsdc ?? a.priceMicroUsdc), 0);
  if (uptoMax > 0) await ensurePermit2Approval(orch, uptoMax);

  // One paying fetch per scheme, reused across calls (each binds its own x402 scheme to the signer).
  const fetchByScheme = {
    exact: paidFetchFor("exact", orch.signer),
    upto: paidFetchFor("upto", orch.signer),
  } as const;

  // Fire concurrently: the x402 payer signs each authorization independently (random EIP-3009 /
  // Permit2 nonces, gasless via the facilitator), so there is no payer-nonce contention. The
  // on-chain logCall heartbeats serialize safely via the send-mutex in logCall.ts.
  const settled = await Promise.allSettled(
    plan.map(async c => {
      const scheme = getAgent(c.agent)?.scheme ?? "exact";
      const res = await fetchByScheme[scheme](`${baseUrl}/api/agents/${c.agent}`, {
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
