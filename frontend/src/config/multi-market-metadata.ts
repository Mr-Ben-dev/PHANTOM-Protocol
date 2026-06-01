/**
 * PHANTOM Protocol — PhantomMulti Market Metadata
 *
 * Static metadata for the 10 seeded multi-outcome markets.
 * Keyed by market ID (0-indexed, matching seed-multi-markets.ts creation order).
 */

import type { MarketMeta } from "./market-metadata";

/** Indexed by market ID (matches seed-multi-markets.ts creation order) */
export const MULTI_MARKET_METADATA: MarketMeta[] = [
  // 0 — BTC range Q3 2026
  {
    image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=640&q=80",
    category: "Crypto",
    tag: "BTC",
    hot: true,
  },
  // 1 — AI coding assistant market leader
  {
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=640&q=80",
    category: "Tech",
    tag: "AI",
    hot: true,
  },
  // 2 — ETH dominance in 90 days
  {
    image: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=640&q=80",
    category: "Crypto",
    tag: "ETH",
  },
  // 3 — Fed FOMC decision
  {
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80",
    category: "Finance",
    tag: "Fed",
  },
  // 4 — SOL price end of 2026
  {
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=640&q=80",
    category: "Crypto",
    tag: "SOL",
  },
  // 5 — L2 TVL leader Q2 2026
  {
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&q=80",
    category: "Crypto",
    tag: "L2",
    isNew: true,
  },
  // 6 — US CPI print
  {
    image: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=640&q=80",
    category: "Finance",
    tag: "Macro",
  },
  // 7 — Largest stablecoin 2026
  {
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80",
    category: "Finance",
    tag: "Stablecoins",
  },
  // 8 — Fed rate cuts in 2026
  {
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80",
    category: "Politics",
    tag: "Fed Policy",
  },
  // 9 — Chain with most daily txs Q3 2026
  {
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&q=80",
    category: "Crypto",
    tag: "Throughput",
    isNew: true,
  },
];

export function getMultiMarketMeta(id: bigint): MarketMeta | undefined {
  return MULTI_MARKET_METADATA[Number(id)];
}

export { CATEGORY_COLORS } from "./market-metadata";
