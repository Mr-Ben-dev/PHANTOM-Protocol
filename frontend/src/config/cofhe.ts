import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { chains } from "@cofhe/sdk/chains";

/**
 * CoFHE SDK configuration.
 * @cofhe/react is not yet published — we use @cofhe/sdk/web directly.
 * The client is a singleton; call connectCofhe() after wallet connects.
 */
export const cofheConfig = createCofheConfig({
  supportedChains: [chains.arbSepolia],
});

export const cofheClient = createCofheClient(cofheConfig);
