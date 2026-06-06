import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

/**
 * Shared x402 server config — built ONCE (module singleton). Imported only by the gated route, so it
 * never reaches the client bundle. Uses the `exact` scheme (fixed price-per-call, EIP-3009
 * transferWithAuthorization). The facilitator covers gas and handles verify/settle.
 *
 * @x402/evm pinned to 2.12.0 — past the 2.9.0–2.11.0 bad-proxy window, before any unverified bump.
 */
export const X402_NETWORK = "eip155:10143";
const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const FACILITATOR_URL = process.env.NEXT_PUBLIC_X402_FACILITATOR_URL || "https://x402-facilitator.molandak.org";

const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
export const x402Server = new x402ResourceServer(facilitator);

const scheme = new ExactEvmScheme();
// Dollar amount → on-chain USDC amount (6 decimals). extra carries the EIP-712 token domain.
scheme.registerMoneyParser(async (amount: number, network: string) => {
  if (network !== X402_NETWORK) return null;
  return {
    amount: Math.floor(amount * 1_000_000).toString(),
    asset: USDC,
    extra: { name: "USDC", version: "2" },
  };
});
x402Server.register(X402_NETWORK, scheme);
