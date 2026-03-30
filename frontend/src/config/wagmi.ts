import { createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

/**
 * Wagmi 3.x config — native connectors only.
 * RainbowKit is intentionally excluded (wagmi 3.x incompatible).
 */
export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
  },
});
