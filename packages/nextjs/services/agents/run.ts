import { runLLM } from "./llm";
import type { AgentMeta } from "./registry";
import { createHash } from "crypto";

/**
 * SERVER-ONLY agent execution. Dispatches by agent id. Runs AFTER x402 verification (never before).
 * - deterministic agents: pure, instant, no API spend → the demo-reliability backbone.
 * - llm agents: one runLLM call with a bounded prompt.
 */
export async function runAgent(agent: AgentMeta, rawInput: string): Promise<string> {
  const input = (rawInput ?? "").toString().slice(0, 4000); // bound input → bounds cost + latency

  switch (agent.id) {
    case "stamp": {
      const hash = createHash("sha256").update(input).digest("hex");
      return `sha256: 0x${hash}`;
    }
    case "tldr":
      return runLLM(
        `Summarize the following into ONE sharp sentence (max 25 words):\n\n${input}`,
        "You are a terse summarizer. Output exactly one sentence. No preamble, no quotes.",
      );
    case "sentiment":
      return runLLM(
        `Classify the sentiment of this text and give a one-line reason:\n\n${input}`,
        "You are a sentiment classifier. Reply on ONE line as 'LABEL — short reason', where LABEL is Positive, Negative, Neutral, or Mixed.",
      );
    default:
      throw new Error(`unknown agent: ${agent.id}`);
  }
}
