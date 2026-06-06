/**
 * Pricing math shared by cost-logging (#2) and upto metering (#3).
 *
 * Rates are Claude Haiku 4.5 list price (USD per token). Adjust if Anthropic changes them.
 * Anthropic reports cache reads/writes SEPARATELY from input_tokens, so they're summed independently.
 */
export const HAIKU_RATES = {
  input: 1 / 1_000_000, // $1 / MTok
  output: 5 / 1_000_000, // $5 / MTok
  cacheRead: 0.1 / 1_000_000, // $0.10 / MTok (cache hits)
  cacheWrite: 1.25 / 1_000_000, // $1.25 / MTok (5-min cache writes)
};

export interface LlmUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/** Actual USD cost of one Haiku call from its token usage. */
export function llmCostUsd(u: LlmUsage): number {
  return (
    (u.input_tokens ?? 0) * HAIKU_RATES.input +
    (u.cache_read_input_tokens ?? 0) * HAIKU_RATES.cacheRead +
    (u.cache_creation_input_tokens ?? 0) * HAIKU_RATES.cacheWrite +
    (u.output_tokens ?? 0) * HAIKU_RATES.output
  );
}

// Metering policy for the `upto` scheme: charge cost × markup, floored at a minimum fee, capped at
// the buyer-authorized max. Guarantees a positive margin while only billing for actual usage.
export const MARKUP = 1.6; // 60% margin over measured cost
export const MIN_FEE_USD = 0.0003; // floor so a near-free call still pays something

/** The amount to actually settle for a metered call: clamp(cost×markup, minFee, max). */
export function meteredSettleUsd(costUsd: number, maxUsd: number): number {
  const target = Math.max(MIN_FEE_USD, costUsd * MARKUP);
  return Math.min(maxUsd, target);
}

export const usdToMicro = (usd: number) => Math.round(usd * 1_000_000);
