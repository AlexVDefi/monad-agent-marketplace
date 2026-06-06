// Headless x402 client — verifies the full paid loop without a browser, and is the seed for the
// L3 agent-to-agent flood (a server-side wallet paying per call → many real settlements, no popups).
//
// Usage (from packages/nextjs):
//   CLIENT_PRIVATE_KEY=0x... node scripts/x402Client.mjs <agentId> [count]
// e.g. CLIENT_PRIVATE_KEY=0xca86... node scripts/x402Client.mjs stamp 3
//
// The client wallet must hold testnet USDC (to pay) + a little MON. Pay-to must differ from it.

import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PK = process.env.CLIENT_PRIVATE_KEY;
const AGENT = process.argv[2] || "stamp";
const COUNT = Number(process.argv[3] || "1");
const BASE = process.env.BASE_URL || "http://localhost:3000";

if (!PK) {
  console.error("Set CLIENT_PRIVATE_KEY (a wallet funded with testnet USDC + a little MON).");
  process.exit(1);
}

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
});

const account = privateKeyToAccount(PK);
const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http("https://testnet-rpc.monad.xyz") });

const signer = {
  address: account.address,
  signTypedData: message => walletClient.signTypedData({ ...message, account }),
};
const client = new x402Client().register("eip155:10143", new ExactEvmScheme(signer));
const paidFetch = wrapFetchWithPayment(fetch, client);

console.log(`x402 client ${account.address} → ${COUNT}× ${AGENT} @ ${BASE}`);
for (let i = 0; i < COUNT; i++) {
  const t0 = Date.now();
  try {
    const res = await paidFetch(`${BASE}/api/agents/${AGENT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: `headless x402 test #${i + 1}` }),
    });
    const body = await res.text();
    console.log(`[${i + 1}] HTTP ${res.status} in ${Date.now() - t0}ms → ${body.slice(0, 240)}`);
  } catch (e) {
    console.error(`[${i + 1}] ERROR`, e?.message ?? e);
  }
}
