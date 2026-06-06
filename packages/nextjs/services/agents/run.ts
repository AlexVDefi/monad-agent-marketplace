import { runLLM } from "./llm";
import { llmCostUsd } from "./pricing";
import type { AgentMeta } from "./registry";
import { createHash } from "crypto";

export interface AgentRunResult {
  output: string;
  /** Actual USD cost incurred to produce this output (0 for deterministic agents). */
  costUsd: number;
}

/**
 * SERVER-ONLY agent execution. Dispatches by agent id. Runs AFTER x402 verification (never before).
 * Returns the output AND its real cost, so the route can log margin and (for `upto` agents) settle
 * the actual metered amount instead of a flat estimate.
 */
export async function runAgent(agent: AgentMeta, rawInput: string): Promise<AgentRunResult> {
  const input = (rawInput ?? "").toString().slice(0, 4000); // bound input → bounds cost + latency

  switch (agent.id) {
    case "stamp": {
      const hash = createHash("sha256").update(input).digest("hex");
      return { output: `sha256: 0x${hash}`, costUsd: 0 };
    }
    case "tldr": {
      const { text, usage } = await runLLM(
        `Summarize the following into ONE sharp sentence (max 25 words):\n\n${input}`,
        "You are a terse summarizer. Output exactly one sentence. No preamble, no quotes.",
      );
      return { output: text, costUsd: llmCostUsd(usage) };
    }
    case "sentiment": {
      const { text, usage } = await runLLM(
        `Classify the sentiment of this text and give a one-line reason:\n\n${input}`,
        "You are a sentiment classifier. Reply on ONE line as 'LABEL — short reason', where LABEL is Positive, Negative, Neutral, or Mixed.",
      );
      return { output: text, costUsd: llmCostUsd(usage) };
    }
    default:
      throw new Error(`unknown agent: ${agent.id}`);
  }
}
