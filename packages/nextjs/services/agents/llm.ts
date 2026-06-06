import Anthropic from "@anthropic-ai/sdk";

/**
 * The ONE swappable LLM function. Provider-swap = edit this file only.
 *
 * Reads ANTHROPIC_API_KEY from the environment (server-only — never shipped to the client).
 * NOTE: this is the app-runtime key, NOT covered by a Claude Max/Code subscription. Set a HARD
 * monthly spend cap in the Anthropic Console — testnet USDC is free, so the x402 paywall does not
 * protect your real API budget if strangers hammer the endpoint.
 */
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5";

// HARD cap. Bounds cost — and therefore the worst-case x402 price per call.
// Haiku 4.5 output is ~$5/1M tokens => 400 tokens ~= $0.002 ceiling per call.
const MAX_TOKENS = 400;

/**
 * Single server-side LLM call. Returns the assistant's text.
 * @param prompt The user turn (the request being paid for).
 * @param system The stable instruction prefix. Marked for prompt caching (5-min TTL).
 */
export async function runLLM(prompt: string, system: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // system as an array of blocks; cache_control on the last block sets the cache breakpoint.
    // (No-ops on Haiku until the prefix exceeds 4096 tokens — harmless, free when it grows.)
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim();
}
