import { defineChain } from "viem";

// Monad Testnet (chain 10143). webSocket is REQUIRED for the live payment-stream
// feed (useScaffoldWatchContractEvent over wss). Do NOT rely on long-range
// eth_getLogs on Monad full nodes — stream via websockets instead.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
      webSocket: ["wss://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
});
