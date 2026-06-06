import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http, webSocket } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { monadTestnet } from "~~/utils/customChains";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";

const { targetNetworks } = scaffoldConfig;

// We always want to have mainnet enabled (ENS resolution, ETH price, etc). But only once.
export const enabledChains = targetNetworks.find((network: Chain) => network.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client({ chain }) {
    // Monad: prefer the websocket transport so useScaffoldWatchContractEvent subscribes via
    // eth_subscribe (push, sub-second) instead of the slow HTTP eth_getLogs polling path. This is
    // what makes the live payment-stream feed tick in real time. http() stays as a fallback so a
    // dropped ws mid-demo degrades gracefully instead of killing the hero.
    if (chain.id === monadTestnet.id) {
      const ws = chain.rpcUrls.default.webSocket?.[0];
      return createClient({
        chain,
        transport: fallback([...(ws ? [webSocket(ws)] : []), http("https://testnet-rpc.monad.xyz")]),
      });
    }

    const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
    const rpcFallbacks = alchemyHttpUrl ? [http(alchemyHttpUrl), http()] : [http()];

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      ...(chain.id !== (hardhat as Chain).id
        ? {
            pollingInterval: scaffoldConfig.pollingInterval,
          }
        : {}),
    });
  },
});
