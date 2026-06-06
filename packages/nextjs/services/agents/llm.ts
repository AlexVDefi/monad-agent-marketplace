import type { LlmUsage } from "./pricing";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The ONE swappable LLM function. Provider-swap = edit this file only.
 *
 * Reads ANTHROPIC_API_KEY from the environment (server-only — never shipped to the client).
 * NOTE: this is the app-runtime key, NOT covered by a Claude Max/Code subscription. Set a HARD
 * monthly spend cap in the Anthropic Console — testnet USDC is free, so the x402 paywall does not
 * protect your real API budget if strangers hammer the endpoint.
 *
 * Returns the text AND the token usage, so callers can compute the real per-call cost (used for
 * cost logging and for `upto` metered pricing).
 */
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5";

// HARD cap on output tokens — bounds the worst-case cost (and therefore the metered ceiling).
const MAX_TOKENS = 400;

export interface LlmResult {
  text: string;
  usage: LlmUsage;
}

export async function runLLM(prompt: string, system: string): Promise<LlmResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim();

  const u = response.usage;
  return {
    text,
    usage: {
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
    },
  };
}
