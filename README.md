# 🜂 Agent Bazaar — a live on-chain AI agent economy

**Monad Blitz Lisbon · built on [scaffold-eth-monad](https://github.com/monad-developers/scaffold-eth-monad)**

A storefront of small AI services you **discover, pay-per-call (x402 / USDC), and rate (on-chain reputation)** — no signup, no API key, no subscription. The hero is a **live payment stream**: micro-payments settling on **Monad testnet in under a second**, ticking `request → 402 → signed → settled` across the screen — a cadence impossible on an Ethereum L1.

The AI runs **off-chain** in a normal Next.js API route. The chain is the **payment + identity + reputation rail**.

---

## What's live

| Piece | Status |
| --- | --- |
| **x402 pay-per-call** (`exact` scheme, USDC, EIP-3009) | ✅ no-pay → HTTP 402; paid → 200 + on-chain USDC settlement |
| **`AgentBazaar` contract** — per-call event source + 👍 reputation | ✅ deployed on Monad testnet via the **Monad Foundry fork** |
| **Live payment stream** (websocket `CallLogged` feed) | ✅ sub-second, capped, optimistic + on-chain confirm |
| **On-chain reputation** — `rate()` / `Rated`, live leaderboard | ✅ rate 👍 → leaderboard reorders live |
| **2 LLM agents** (Claude Haiku 4.5) + **1 deterministic agent** | ✅ deterministic agent leads the demo (instant, no API) |
| **ERC-8004** identity + reputation registries | 🔭 roadmap — our on-chain reputation maps onto the standard |

**Deployed contract:** `AgentBazaar` → [`0xE7417730C2DA5F9719fF6C1ad04E40bC36c1c09C`](https://testnet.monadvision.com/address/0xE7417730C2DA5F9719fF6C1ad04E40bC36c1c09C) (chain 10143)

---

## Architecture

```
 Browser (buyer wallet)                 Next.js (packages/nextjs)                    Monad testnet
 ─────────────────────                  ─────────────────────────                   ─────────────
 CALL ▸  ──useAgentCall──▶  POST /api/agents/[id]  ──withX402 verify──▶  USDC transferWithAuthorization
   │  (x402 sign EIP-712)        │  (verify → run → settle)                (facilitator settles, <1s)
   │                            run agent off-chain (Haiku 4.5 / pure fn)
   │                             │
   │                            logCall(agentId, price, taskHash) ───────▶  AgentBazaar.CallLogged ─┐
   ▼                                                                                                │
 PaymentStream ◀───────────────── useScaffoldWatchContractEvent (wss) ◀──────────────────────────┘
   request→402→signed→settled ✓ + explorer link
```

- **On-chain:** x402/USDC settlement (pre-deployed facilitator infra) + one tiny custom contract `AgentBazaar` (a call **logger** + 👍 reputation — *not* escrow; money moves via x402, never through this contract).
- **Off-chain (`packages/nextjs`):** the agents (one swappable `runLLM`), the x402-gated endpoint, the payment-stream UI.

## Tech

- **Frontend:** scaffold-eth-monad (Next.js 14 · wagmi 2.12.23 · viem 2.21.32 · RainbowKit), bespoke "trading terminal" UI (Tailwind + CSS, no component-library dependency).
- **Payments:** `@x402/{core,evm,fetch,next}` pinned to `2.12.0` (past the 2.9–2.11 bad-proxy window). USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3`.
- **AI:** `@anthropic-ai/sdk`, model `claude-haiku-4-5`, hard `max_tokens` cap (bounds cost + worst-case price).
- **Contract:** Solidity 0.8.x, deployed via the **Monad-specific Foundry fork** (`forge 1.5.0-stable-monad`).

## Run it

```bash
# packages/nextjs/.env.local
ANTHROPIC_API_KEY=...                 # server-only; set a hard spend cap
PAY_TO_ADDRESS=0x...                  # agent treasury (receives USDC)
SERVER_SIGNER_PRIVATE_KEY=0x...       # funded with MON; signs the logCall heartbeat
NEXT_PUBLIC_AGENT_BAZAAR_ADDRESS=0xE7417730C2DA5F9719fF6C1ad04E40bC36c1c09C

yarn install && yarn start            # → http://localhost:3000
```

Connect a wallet on Monad testnet (MON for gas + testnet USDC from https://faucet.circle.com), then hit **CALL ▸**.

## The 3-minute demo

1. Leaderboard of 3 agents with live on-chain reputation.
2. **Lead with the deterministic agent** (instant, can't fail) → the stream ticks `request → 402 → signed → settled ✓ 0.3s`, fees ≈ nothing. Then fire a Haiku LLM agent.
3. Rate 👍 → reputation updates live on the leaderboard (a real `rate()` tx).
4. *"The chain verifies payment + identity + reputation — not work-quality yet; that's ERC-8004's Validation Registry, coming soon."*

> Honest scope: the chain verifies **payment, the call record, and reputation**. Work-quality validation and the full ERC-8004 registry integration are the roadmap.

---

*Submission: fork of [`monad-blitz-lisbon`](https://github.com/monad-developers/monad-blitz-lisbon). Submit the repo URL at the [Blitz Portal](https://blitz.devnads.com).*
