import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { UptoEvmScheme } from "@x402/evm/upto/server";

/**
 * Shared x402 server config. Two server instances — one per scheme — so each agent picks the right
 * one (no ambiguity about registering multiple schemes on one network):
 *  - exactServer: fixed price per call (deterministic agent).
 *  - uptoServer:  metered — buyer authorizes a max, server settles the actual cost (≤ max).
 *
 * @x402/evm pinned to 2.12.0 — the known-good version for the `upto` scheme (the 2.9.0–2.11.0
 * bad-proxy window specifically broke upto).
 */
export const X402_NETWORK = "eip155:10143";
const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const FACILITATOR_URL = process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || "https://x402-facilitator.molandak.org";

const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

// Dollar amount → on-chain USDC amount (6 decimals) + EIP-712 token domain.
const moneyParser = async (amount: number, network: string) => {
  if (network !== X402_NETWORK) return null;
  return {
    amount: Math.floor(amount * 1_000_000).toString(),
    asset: USDC,
    extra: { name: "USDC", version: "2" },
  };
};

const exactScheme = new ExactEvmScheme();
exactScheme.registerMoneyParser(moneyParser);
export const exactServer = new x402ResourceServer(facilitator).register(X402_NETWORK, exactScheme);

const uptoScheme = new UptoEvmScheme();
uptoScheme.registerMoneyParser(moneyParser);
export const uptoServer = new x402ResourceServer(facilitator).register(X402_NETWORK, uptoScheme);
