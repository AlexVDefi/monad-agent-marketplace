/**
 * Agent registry — CLIENT-SAFE metadata (no Node/Anthropic imports). Imported by the storefront UI
 * and the server route. Execution lives in server-only run.ts, keyed by `id`.
 *
 * Pricing scheme per agent:
 *  - "exact": fixed price per call (deterministic agent — known $0 cost).
 *  - "upto":  metered — the buyer authorizes maxPriceUsd, the server settles the ACTUAL measured
 *             cost × markup (≤ max). priceUsd is the typical/display estimate.
 *
 * agentId: numeric id used by AgentBazaar.logCall AND as the ERC-8004 identity tokenId.
 */
export type AgentKind = "deterministic" | "llm";
export type AgentScheme = "exact" | "upto";

export interface AgentMeta {
  id: string;
  agentId: number;
  name: string;
  glyph: string;
  blurb: string;
  kind: AgentKind;
  scheme: AgentScheme;
  /** exact: the charged price. upto: typical/display estimate. */
  priceUsd: `$${string}`;
  priceMicroUsdc: number;
  /** upto only: the buyer-authorized ceiling. */
  maxPriceUsd?: `$${string}`;
  maxMicroUsdc?: number;
  tokenId?: number;
  placeholder: string;
}

export const AGENTS: AgentMeta[] = [
  {
    id: "stamp",
    agentId: 1,
    name: "Notary Stamp",
    glyph: "🧾",
    blurb: "Instant SHA-256 fingerprint of any input. Pure transform — no AI, never fails.",
    kind: "deterministic",
    scheme: "exact",
    priceUsd: "$0.0005",
    priceMicroUsdc: 500,
    placeholder: "Any text or document to fingerprint…",
  },
  {
    id: "tldr",
    agentId: 2,
    name: "TL;DR Agent",
    glyph: "✂️",
    blurb: "Summarizes any text into one sharp sentence. Metered — you pay for the tokens used.",
    kind: "llm",
    scheme: "upto",
    priceUsd: "$0.001",
    priceMicroUsdc: 1000,
    maxPriceUsd: "$0.01",
    maxMicroUsdc: 10000,
    placeholder: "Paste text to summarize…",
  },
  {
    id: "sentiment",
    agentId: 3,
    name: "Sentiment Analyzer",
    glyph: "🎭",
    blurb: "Reads tone and returns a one-line verdict. Metered — you pay for the tokens used.",
    kind: "llm",
    scheme: "upto",
    priceUsd: "$0.001",
    priceMicroUsdc: 1000,
    maxPriceUsd: "$0.01",
    maxMicroUsdc: 10000,
    placeholder: "Paste a message to analyze…",
  },
];

export const getAgent = (id: string): AgentMeta | undefined => AGENTS.find(a => a.id === id);
