/**
 * Agent registry — CLIENT-SAFE metadata (no Node/Anthropic imports). Imported by both the
 * storefront UI and the server route. The actual execution (LLM / deterministic transform) lives
 * in server-only run.ts, keyed by `id`.
 *
 * Pricing: x402 `exact` scheme. priceMicroUsdc MUST equal floor(priceUsd * 1e6) — it is what we
 * pass to AgentBazaar.logCall so the on-chain feed and the paywall agree.
 *
 * agentId: numeric id used by AgentBazaar.logCall AND as the ERC-8004 identity tokenId.
 */
export type AgentKind = "deterministic" | "llm";

export interface AgentMeta {
  id: string;
  agentId: number;
  name: string;
  glyph: string;
  blurb: string;
  kind: AgentKind;
  priceUsd: `$${string}`;
  priceMicroUsdc: number;
  /** ERC-8004 identity tokenId, set once agents are registered (L1). */
  tokenId?: number;
  placeholder: string;
}

export const AGENTS: AgentMeta[] = [
  {
    id: "stamp",
    agentId: 1,
    name: "Notary Stamp",
    glyph: "🜃",
    blurb: "Instant SHA-256 fingerprint of any input. Pure transform — no AI, never fails.",
    kind: "deterministic",
    priceUsd: "$0.0005",
    priceMicroUsdc: 500,
    placeholder: "Any text or document to fingerprint…",
  },
  {
    id: "tldr",
    agentId: 2,
    name: "TL;DR Agent",
    glyph: "🜂",
    blurb: "Summarizes any text into one sharp sentence.",
    kind: "llm",
    priceUsd: "$0.001",
    priceMicroUsdc: 1000,
    placeholder: "Paste text to summarize…",
  },
  {
    id: "sentiment",
    agentId: 3,
    name: "Sentiment Analyzer",
    glyph: "🜁",
    blurb: "Reads tone and returns a one-line verdict.",
    kind: "llm",
    priceUsd: "$0.001",
    priceMicroUsdc: 1000,
    placeholder: "Paste a message to analyze…",
  },
];

export const getAgent = (id: string): AgentMeta | undefined => AGENTS.find(a => a.id === id);
